import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { connectDB } from '@/lib/db';
import { extractBearerToken, verifyAdminToken } from '@/lib/auth';
import { getElectionContract } from '@/lib/chain';
import { ElectionMeta } from '@/models/ElectionMeta';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const query = status ? { status } : {};
    const elections = await ElectionMeta.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, elections });
  } catch {
    const { memDb } = await import('@/lib/inMemoryDb');
    return NextResponse.json({ success: true, elections: memDb.elections });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawToken = extractBearerToken(req.headers.get('authorization'));
  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = verifyAdminToken(rawToken);
    if (admin.role !== 'ELECTION_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: ELECTION_ADMIN role required' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, candidates, startTime, endTime } = body;
  if (!title || !Array.isArray(candidates) || candidates.length < 2) {
    return NextResponse.json(
      { error: 'title and at least 2 candidate names are required' },
      { status: 400 }
    );
  }

  const start = startTime ? Math.floor(new Date(startTime).getTime() / 1000) : Math.floor(Date.now() / 1000);
  const end = endTime ? Math.floor(new Date(endTime).getTime() / 1000) : start + 7 * 24 * 3600;

  const electionIdBytes32 = ethers.keccak256(
    ethers.toUtf8Bytes(title + Date.now().toString())
  );

  try {
    const electionContract = await getElectionContract();
    const tx = await electionContract.createElection(
      electionIdBytes32,
      title,
      start,
      end,
      candidates
    );
    await tx.wait();

    // Automatically open for demo
    const openTx = await electionContract.openElection(electionIdBytes32);
    await openTx.wait();

    await connectDB();
    const doc = await ElectionMeta.create({
      electionId: electionIdBytes32,
      title,
      candidates: candidates.map((name: string, idx: number) => ({ id: idx + 1, name })),
      status: 'Open',
      startTime: new Date(start * 1000),
      endTime: new Date(end * 1000),
      syncedFromChainAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      election: doc,
      electionId: electionIdBytes32,
      txHash: tx.hash,
    });
  } catch (err: any) {
    console.error('[Admin Election API] Error creating election:', err);
    return NextResponse.json(
      { error: err.reason || err.message || 'Smart contract error' },
      { status: 500 }
    );
  }
}
