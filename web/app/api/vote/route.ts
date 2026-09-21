import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { connectDB } from '@/lib/db';
import { extractBearerToken, verifyVoterToken } from '@/lib/auth';
import { voteRateLimit } from '@/lib/rateLimit';
import { getBallotContract, getVoterRegistryContract } from '@/lib/chain';
import { Voter } from '@/models/Voter';
import { FlaggedVote } from '@/models/FlaggedVote';
import { SyncQueueLog } from '@/models/SyncQueueLog';
import { emitVoteCast, emitFlaggedVote } from '@/lib/socket-server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  // 1. Rate limiting
  const rateLimitResult = voteRateLimit(ip);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many vote submission attempts. Please slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // 2. Auth checking
  const rawToken = extractBearerToken(req.headers.get('authorization'));
  if (!rawToken) {
    return NextResponse.json({ error: 'Missing Authorization header.' }, { status: 401 });
  }

  let tokenPayload;
  try {
    tokenPayload = verifyVoterToken(rawToken);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired auth session.' }, { status: 401 });
  }

  const isIdentityVerified = tokenPayload.otpVerified || tokenPayload.nfcVerified;
  if (!isIdentityVerified || !tokenPayload.faceVerified) {
    return NextResponse.json(
      { error: 'MFA incomplete: Both NFC Smart Card and biometric face match must pass before voting.' },
      { status: 403 }
    );
  }

  // 3. Body parsing
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const {
    electionId,
    candidateId,
    clientRequestId,
    voterCommitment,
    deviceFingerprintHash,
    faceConfidence = 0.95,
    livenessScore = 0.95,
  } = body;

  if (!electionId || candidateId === undefined || !clientRequestId || !voterCommitment) {
    return NextResponse.json(
      { error: 'electionId, candidateId, clientRequestId, and voterCommitment are required.' },
      { status: 400 }
    );
  }

  let existingSync: any = null;
  let voter: any = null;
  let recentIpLogsCount = 0;
  let timeSinceLastAttempt = 999.0;

  try {
    await connectDB();
    // 4. Idempotency check
    existingSync = await SyncQueueLog.findOne({ clientRequestId });
    // 5. DB Voter state check
    voter = await Voter.findOne({
      voterHashId: tokenPayload.voterHashId,
      electionId,
    });
    // 6. Behavioral anomaly feature aggregation
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    recentIpLogsCount = await SyncQueueLog.countDocuments({
      createdAt: { $gte: fiveMinutesAgo },
    });
    const lastDeviceAttempt = await SyncQueueLog.findOne({
      deviceId: deviceFingerprintHash || 'unknown',
    }).sort({ createdAt: -1 });
    if (lastDeviceAttempt && lastDeviceAttempt.createdAt) {
      timeSinceLastAttempt = (Date.now() - new Date(lastDeviceAttempt.createdAt).getTime()) / 1000;
    }
  } catch (dbErr) {
    console.warn('[Vote API] MongoDB unavailable, using in-memory store:', dbErr);
    const { memDb } = await import('@/lib/inMemoryDb');
    existingSync = memDb.getSyncLog(clientRequestId);
    voter = memDb.getVoter(tokenPayload.voterHashId, electionId);
    recentIpLogsCount = memDb.countRecentSyncLogs(new Date(Date.now() - 5 * 60 * 1000));
  }

  if (existingSync && existingSync.status === 'synced') {
    return NextResponse.json({
      success: true,
      message: 'Vote already processed (idempotent response)',
      status: 'synced',
      clientRequestId,
    });
  }

  if (voter && voter.hasVoted) {
    return NextResponse.json(
      { error: 'This voter has already cast a vote for this election.' },
      { status: 409 }
    );
  }

  const isDeviceKnown = voter?.deviceFingerprints?.includes(deviceFingerprintHash) ?? false;

  // 7. Call AI Fraud Service
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
  let aiRisk = {
    risk_score: 0.1,
    flagged: false,
    review_required: false,
    reason_codes: [] as string[],
    contributing_factors: [] as any[],
    confidence_caveat: 'Default heuristic.',
  };

  try {
    const aiResp = await fetch(`${aiServiceUrl}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_fingerprint_hash: deviceFingerprintHash || 'dev_client',
        device_seen_before: isDeviceKnown,
        ip_velocity: recentIpLogsCount,
        geo_implausible: false,
        timing_regularity: timeSinceLastAttempt < 3.0 ? 0.95 : 0.1,
        face_confidence: Number(faceConfidence),
        liveness_score: Number(livenessScore),
        duplicate_hash: Boolean(voter?.hasVoted),
        time_since_last_attempt: timeSinceLastAttempt,
        voter_hash: voterCommitment,
        election_id: electionId,
      }),
    });

    if (aiResp.ok) {
      aiRisk = await aiResp.json();
    }
  } catch (err) {
    console.warn('[Vote API] AI microservice unavailable, proceeding with baseline heuristic:', err);
  }

  // 8. If flagged by AI: write to flagged_votes queue (never block the vote!)
  const attemptId = crypto.randomUUID();
  if (aiRisk.flagged) {
    try {
      await FlaggedVote.create({
        attemptId,
        electionId,
        voterHashId: tokenPayload.voterHashId,
        riskScore: aiRisk.risk_score,
        reasonCodes: aiRisk.reason_codes,
        contributingFactors: aiRisk.contributing_factors,
        confidenceCaveat: aiRisk.confidence_caveat,
        reviewStatus: 'pending',
        voteQueued: true,
      });

      emitFlaggedVote(electionId, {
        attemptId,
        riskScore: aiRisk.risk_score,
        reasonCodes: aiRisk.reason_codes,
      });
    } catch (flagErr) {
      console.error('[Vote API] Error logging flagged vote:', flagErr);
    }
  }

  // 9. On-chain submission to Ballot.sol
  let txHash = '';
  let blockNumber = 0;

  try {
    const ballot = await getBallotContract();
    const voterRegistry = await getVoterRegistryContract();

    // Ensure voter is registered on-chain for demo if needed
    const voterCommitmentBytes32 = voterCommitment.startsWith('0x') && voterCommitment.length === 66
      ? voterCommitment
      : ethers.keccak256(ethers.toUtf8Bytes(voterCommitment));

    const isReg = await voterRegistry.isRegistered(voterCommitmentBytes32, electionId);
    if (!isReg) {
      // Auto-register via admin signer for prototype testing
      const regTx = await voterRegistry.registerVoter(voterCommitmentBytes32, electionId);
      await regTx.wait();
    }

    const tx = await ballot.castVote(
      electionId,
      Number(candidateId),
      voterCommitmentBytes32,
      voterCommitmentBytes32
    );
    const receipt = await tx.wait();
    txHash = receipt.hash;
    blockNumber = receipt.blockNumber;

    emitVoteCast(electionId, {
      candidateId: Number(candidateId),
      timestamp: Math.floor(Date.now() / 1000),
      txHash,
    });
  } catch (chainErr: any) {
    console.error('[Vote API] Smart contract execution failed:', chainErr);
    try {
      await SyncQueueLog.create({
        clientRequestId,
        deviceId: deviceFingerprintHash || 'unknown',
        electionId,
        status: 'failed',
        attempts: 1,
        lastAttemptAt: new Date(),
        errorMessage: chainErr.message || 'Blockchain write reverted',
      });
    } catch {
      const { memDb } = await import('@/lib/inMemoryDb');
      memDb.saveSyncLog({
        clientRequestId,
        deviceId: deviceFingerprintHash || 'unknown',
        electionId,
        status: 'failed',
        attempts: 1,
        lastAttemptAt: new Date(),
        errorMessage: chainErr.message || 'Blockchain write reverted',
        createdAt: new Date(),
      });
    }

    return NextResponse.json(
      { error: `Blockchain error: ${chainErr.reason || chainErr.message || 'Transaction reverted'}` },
      { status: 500 }
    );
  }

  // 10. Update off-chain state (MongoDB with In-Memory fallback)
  try {
    if (voter && voter.save) {
      voter.hasVoted = true;
      voter.faceDescriptor = undefined;
      if (deviceFingerprintHash && !voter.deviceFingerprints.includes(deviceFingerprintHash)) {
        voter.deviceFingerprints.push(deviceFingerprintHash);
      }
      await voter.save();
    }
    await SyncQueueLog.create({
      clientRequestId,
      deviceId: deviceFingerprintHash || 'unknown',
      electionId,
      status: 'synced',
      attempts: 1,
      lastAttemptAt: new Date(),
      syncedAt: new Date(),
    });
  } catch {
    const { memDb } = await import('@/lib/inMemoryDb');
    if (voter) {
      voter.hasVoted = true;
      voter.faceDescriptor = undefined;
      memDb.saveVoter(voter);
    }
    memDb.saveSyncLog({
      clientRequestId,
      deviceId: deviceFingerprintHash || 'unknown',
      electionId,
      status: 'synced',
      attempts: 1,
      lastAttemptAt: new Date(),
      syncedAt: new Date(),
      createdAt: new Date(),
    });
  }

  return NextResponse.json({
    success: true,
    txHash,
    blockNumber,
    candidateId: Number(candidateId),
    electionId,
    flagged: aiRisk.flagged,
    riskScore: aiRisk.risk_score,
  });
}
