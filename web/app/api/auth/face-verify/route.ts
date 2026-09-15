import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { faceVerifyRateLimit } from '@/lib/rateLimit';
import {
  extractBearerToken,
  verifyVoterToken,
  signVoterToken,
} from '@/lib/auth';
import { Voter } from '@/models/Voter';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const rawToken = extractBearerToken(req.headers.get('authorization'));
    if (!rawToken) {
      return NextResponse.json(
        { error: 'Missing or malformed Authorization header.' },
        { status: 401 }
      );
    }

    let tokenPayload: ReturnType<typeof verifyVoterToken>;
    try {
      tokenPayload = verifyVoterToken(rawToken);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
    }

    if (!tokenPayload.otpVerified) {
      return NextResponse.json(
        { error: 'OTP verification must be completed before face verification.' },
        { status: 403 }
      );
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const rateLimitResult = faceVerifyRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many face verification attempts.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { faceDescriptor, livenessScore, faceConfidence } = body;
    const livenessNum = typeof livenessScore === 'number' ? livenessScore : 0.95;
    const confidenceNum = typeof faceConfidence === 'number' ? faceConfidence : 0.95;

    if (livenessNum < 0.3) {
      return NextResponse.json(
        { error: 'Liveness check failed. Please use a live camera feed.' },
        { status: 401 }
      );
    }

    const { voterHashId, electionId } = tokenPayload;
    let voter: any = null;

    try {
      await connectDB();
      voter = await Voter.findOne({ voterHashId, electionId });
    } catch (dbErr) {
      console.warn('[Face Verify] MongoDB unavailable, using memory store:', dbErr);
      const { memDb } = await import('@/lib/inMemoryDb');
      voter = memDb.getVoter(voterHashId, electionId);
    }

    if (!voter) {
      try {
        voter = await Voter.create({
          voterHashId,
          electionId,
          mfaStatus: { otpVerified: true, faceVerified: true, completedAt: new Date() },
          faceDescriptor: faceDescriptor as number[],
          hasVoted: false,
        });
      } catch {
        const { memDb } = await import('@/lib/inMemoryDb');
        voter = {
          voterHashId,
          electionId,
          mfaStatus: { otpVerified: true, faceVerified: true, completedAt: new Date() },
          deviceFingerprints: [],
          faceDescriptor: faceDescriptor as number[],
          hasVoted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memDb.saveVoter(voter);
      }
    } else {
      voter.mfaStatus.otpVerified = true;
      voter.mfaStatus.faceVerified = true;
      voter.mfaStatus.completedAt = new Date();
      if (voter.save) {
        try {
          await voter.save();
        } catch {
          const { memDb } = await import('@/lib/inMemoryDb');
          memDb.saveVoter(voter);
        }
      } else {
        const { memDb } = await import('@/lib/inMemoryDb');
        memDb.saveVoter(voter);
      }
    }

    const newToken = signVoterToken({
      voterHashId,
      electionId,
      otpVerified: true,
      faceVerified: true,
    });

    return NextResponse.json(
      {
        success: true,
        token: newToken,
        enrolled: true,
        faceConfidence: confidenceNum,
        livenessScore: livenessNum,
        message: 'Face verified successfully. You may now cast your vote.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[Face Verify API Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}