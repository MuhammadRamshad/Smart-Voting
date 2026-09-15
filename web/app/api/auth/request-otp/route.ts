import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { otpRateLimit } from '@/lib/rateLimit';
import { OtpStore } from '@/models/OtpStore';

// ─── POST /api/auth/request-otp ─────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Rate limit (3 requests per 10 minutes per IP) ────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const rateLimitResult = otpRateLimit(ip);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many OTP requests. Please wait before requesting again.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
        },
      },
    );
  }

  // ── 2. Parse + validate body ──────────────────────────────────────────────
  let body: { voterId?: unknown; electionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { voterId, electionId } = body;

  if (!voterId || typeof voterId !== 'string' || voterId.trim() === '') {
    return NextResponse.json(
      { error: 'voterId must be a non-empty string.' },
      { status: 400 },
    );
  }

  if (!electionId || typeof electionId !== 'string' || electionId.trim() === '') {
    return NextResponse.json(
      { error: 'electionId must be a non-empty string.' },
      { status: 400 },
    );
  }

  // ── 3. Hash voterId (sha256) — never store plaintext ─────────────────────
  const hashedVoterId = crypto
    .createHash('sha256')
    .update(voterId.trim())
    .digest('hex');

  // ── 4. Generate 6-digit OTP ───────────────────────────────────────────────
  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();

  // ── 5. Bcrypt-hash the OTP (10 rounds) ───────────────────────────────────
  const hashedOtp = await bcrypt.hash(plainOtp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // ── 6. Persist OTP record (MongoDB with In-Memory fallback) ───────────────
  try {
    await connectDB();
    await OtpStore.create({
      identifier: hashedVoterId,
      otp: hashedOtp,
      electionId: electionId.trim(),
      expiresAt,
      used: false,
    });
  } catch (dbErr) {
    console.warn('[Request OTP] MongoDB unavailable, storing in memory:', dbErr);
    const { memDb } = await import('@/lib/inMemoryDb');
    memDb.addOtp({
      identifier: hashedVoterId,
      otp: hashedOtp,
      electionId: electionId.trim(),
      expiresAt,
      used: false,
      createdAt: new Date(),
    });
  }

  // ── 7. Dev-mode: log plaintext OTP so testers can use it ──────────────────
  console.log('\n========================================');
  console.log(`[VOTER OTP] Voter ID : ${voterId}`);
  console.log(`[VOTER OTP] One-Time Password : ${plainOtp}`);
  console.log('========================================\n');

  // ── 9. In production an email/SMS would be dispatched here ────────────────
  // e.g. await sendOtpEmail(voterId, plainOtp);

  return NextResponse.json(
    { success: true, message: 'OTP sent. Check console in dev mode.' },
    { status: 200 },
  );
}
