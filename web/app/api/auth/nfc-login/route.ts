import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { signVoterToken } from '@/lib/auth';
import { memDb } from '@/lib/inMemoryDb';
import { connectDB } from '@/lib/db';
import { Voter } from '@/models/Voter';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { uid, electionId } = body;

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'NFC Card UID is required' }, { status: 400 });
    }

    const activeElectionId =
      electionId || '0x3bf3952cfe2b5ae1956147b8f53af6c1e4c8c3122466692b2f15185439baf0d1';

    // Compute deterministic keccak256 hash of the UID
    const uidHash = ethers.keccak256(ethers.toUtf8Bytes(uid.trim()));

    // 1. Check in MongoDB / memDb
    let voter: any = null;
    try {
      await connectDB();
      voter = await Voter.findOne({ uidHash, electionId: activeElectionId });
    } catch {
      // Fallback
    }

    if (!voter) {
      voter = memDb.findVoterByUidHash(uidHash, activeElectionId);
    }

    // Also support finding by raw ID or fallback name for demo convenience
    if (!voter) {
      for (const v of memDb.getAllVoters(activeElectionId)) {
        if (
          v.name.toLowerCase() === uid.trim().toLowerCase() ||
          v.voterHashId.toLowerCase() === uid.trim().toLowerCase()
        ) {
          voter = v;
          break;
        }
      }
    }

    if (!voter) {
      return NextResponse.json(
        { error: 'Card not registered for this election. Please register at an official booth.' },
        { status: 404 }
      );
    }

    // 2. Check if account is blocked
    if (voter.blockedUntil && new Date(voter.blockedUntil) > new Date()) {
      const remainingMin = Math.ceil(
        (new Date(voter.blockedUntil).getTime() - Date.now()) / (60 * 1000)
      );
      return NextResponse.json(
        {
          error: `Card temporarily locked due to failed biometric attempts. Try again in ${remainingMin} minute(s).`,
        },
        { status: 403 }
      );
    }

    // 3. Check if already voted
    if (voter.hasVoted) {
      return NextResponse.json(
        { error: 'Card has already been used to cast a ballot in this election.' },
        { status: 409 }
      );
    }

    // 4. Log authentication attempt
    memDb.addAuthLog({
      logId: `log-${Date.now()}`,
      voterHashId: voter.voterHashId,
      event: 'nfc_scan',
      success: true,
      timestamp: new Date(),
    });

    // 5. Issue token with nfcVerified = true, faceVerified = false
    const token = signVoterToken({
      voterHashId: voter.voterHashId,
      electionId: activeElectionId,
      otpVerified: true,
      nfcVerified: true,
      faceVerified: false,
      voterName: voter.name,
    });

    return NextResponse.json({
      success: true,
      token,
      voterName: voter.name,
      voterHashId: voter.voterHashId,
      electionId: activeElectionId,
      hasEnrolledFace: Boolean(
        voter.faceDescriptor &&
        voter.faceDescriptor.length > 0 &&
        !voter.faceDescriptor.every((x: number) => x === 0)
      ),
    });
  } catch (err: any) {
    console.error('[NFC Login Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
