import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { otpRateLimit } from '@/lib/rateLimit';
import { signVoterToken } from '@/lib/auth';
import { OtpStore } from '@/models/OtpStore';

// ─── POST /api/auth/verify-otp ──────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Rate limit ─────────────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const rateLimitResult = otpRateLimit(ip);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many verification attempts. Please wait and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
        },
      },
    );
  }

  // ── 2. Parse + validate body ──────────────────────────────────────────────
  let body: { voterId?: unknown; electionId?: unknown; otp?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { voterId, electionId, otp } = body;

  if (!voterId || typeof voterId !== 'string' || voterId.trim() === '') {
    return NextResponse.json({ error: 'voterId is required.' }, { status: 400 });
  }
  if (!electionId || typeof electionId !== 'string' || electionId.trim() === '') {
    return NextResponse.json({ error: 'electionId is required.' }, { status: 400 });
  }
  if (!otp || typeof otp !== 'string' || otp.trim() === '') {
    return NextResponse.json({ error: 'otp is required.' }, { status: 400 });
  }

  // ── 3. Hash voterId ───────────────────────────────────────────────────────
  const voterHashId = crypto
    .createHash('sha256')
    .update(voterId.trim())
    .digest('hex');

  // ── 4. Find OTP record (MongoDB with In-Memory fallback) ──────────────────
  let record: { otp: string; _id?: any } | null = null;
  const now = new Date();

  try {
    await connectDB();
    record = await OtpStore.findOne({
      identifier: voterHashId,
      electionId: electionId.trim(),
      used: false,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();
  } catch (dbErr) {
    console.warn('[Verify OTP] MongoDB unavailable, querying memory:', dbErr);
    const { memDb } = await import('@/lib/inMemoryDb');
    record = memDb.findValidOtp(voterHashId, electionId.trim());
  }

  if (!record) {
    return NextResponse.json(
      { error: 'Invalid or expired OTP.' },
      { status: 401 },
    );
  }

  // ── 5. Compare submitted OTP against stored bcrypt hash ───────────────────
  const isMatch = await bcrypt.compare(otp.trim(), record.otp);

  if (!isMatch) {
    return NextResponse.json(
      { error: 'Invalid or expired OTP.' },
      { status: 401 },
    );
  }

  // ── 6. Mark OTP as consumed ───────────────────────────────────────────────
  try {
    if (record._id) {
      await OtpStore.updateOne({ _id: record._id }, { $set: { used: true } });
    }
  } catch {
    const { memDb } = await import('@/lib/inMemoryDb');
    memDb.markOtpUsed(voterHashId, electionId.trim());
  }

  // ── 7. Issue voter JWT (OTP step complete, face not yet verified) ─────────
  const token = signVoterToken({
    voterHashId,
    electionId: electionId.trim(),
    otpVerified: true,
    faceVerified: false,
  });

  return NextResponse.json(
    {
      success: true,
      token,
      message: 'OTP verified. Proceed to face verification.',
    },
    { status: 200 },
  );
}
