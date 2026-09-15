import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { extractBearerToken, verifyAdminToken } from '@/lib/auth';
import { FlaggedVote } from '@/models/FlaggedVote';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const electionId = searchParams.get('electionId') || undefined;

  try {
    await connectDB();
    const query: any = {};
    if (status && status !== 'all') query.reviewStatus = status;
    if (electionId) query.electionId = electionId;

    const flags = await FlaggedVote.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, flaggedVotes: flags });
  } catch {
    const { memDb } = await import('@/lib/inMemoryDb');
    const flags = memDb.getFlags(status, electionId);
    return NextResponse.json({ success: true, flaggedVotes: flags });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const rawToken = extractBearerToken(req.headers.get('authorization'));
  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let admin;
  try {
    admin = verifyAdminToken(rawToken);
  } catch {
    return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { attemptId, reviewStatus, reviewNote } = body;
  if (!attemptId || !reviewStatus) {
    return NextResponse.json({ error: 'attemptId and reviewStatus required' }, { status: 400 });
  }

  try {
    await connectDB();
    // ANNOTATION ONLY: updates review state, NEVER touches the immutable ballot
    const updated = await FlaggedVote.findOneAndUpdate(
      { attemptId },
      {
        reviewStatus,
        reviewedBy: admin.adminId,
        reviewedAt: new Date(),
        ...(reviewNote ? { reviewNote } : {}),
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Flagged vote record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, flaggedVote: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
