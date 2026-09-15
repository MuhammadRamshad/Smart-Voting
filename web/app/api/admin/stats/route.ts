import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getBallotContract, getElectionContract } from '@/lib/chain';
import { FlaggedVote } from '@/models/FlaggedVote';
import { SyncQueueLog } from '@/models/SyncQueueLog';
import { ElectionMeta } from '@/models/ElectionMeta';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const electionId = searchParams.get('electionId');

  try {
    await connectDB();

    // 1. Total votes from on-chain VoteCast events
    let totalVotes = 0;
    let candidateVoteCounts: Array<{ candidateId: number; name: string; count: number }> = [];

    if (electionId) {
      const ballot = await getBallotContract();
      const filter = ballot.filters.VoteCast(electionId);
      const logs = await ballot.queryFilter(filter, 0, 'latest');
      totalVotes = logs.length;

      const electionDoc = await ElectionMeta.findOne({ electionId });
      if (electionDoc && electionDoc.candidates) {
        for (const cand of electionDoc.candidates) {
          const cCount = await ballot.getVoteCount(electionId, cand.id);
          candidateVoteCounts.push({
            candidateId: cand.id,
            name: cand.name,
            count: Number(cCount),
          });
        }
      }
    } else {
      const latestElection = await ElectionMeta.findOne({ status: 'Open' }).sort({ createdAt: -1 });
      if (latestElection) {
        const ballot = await getBallotContract();
        const filter = ballot.filters.VoteCast(latestElection.electionId);
        const logs = await ballot.queryFilter(filter, 0, 'latest');
        totalVotes = logs.length;

        for (const cand of latestElection.candidates) {
          const cCount = await ballot.getVoteCount(latestElection.electionId, cand.id);
          candidateVoteCounts.push({
            candidateId: cand.id,
            name: cand.name,
            count: Number(cCount),
          });
        }
      }
    }

    let flaggedCount = 0;
    let pendingSyncCount = 0;
    let recentFlags: any[] = [];
    let activeElectionsCount = 1;

    try {
      const flaggedQuery = electionId ? { electionId, reviewStatus: 'pending' } : { reviewStatus: 'pending' };
      flaggedCount = await FlaggedVote.countDocuments(flaggedQuery);
      pendingSyncCount = await SyncQueueLog.countDocuments({ status: 'pending' });
      recentFlags = await FlaggedVote.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      activeElectionsCount = await ElectionMeta.countDocuments({ status: 'Open' });
    } catch {
      const { memDb } = await import('@/lib/inMemoryDb');
      flaggedCount = memDb.getFlags('pending', electionId || undefined).length;
      recentFlags = memDb.getFlags(undefined, electionId || undefined).slice(0, 10);
    }

    return NextResponse.json({
      success: true,
      totalVotes,
      flaggedCount,
      pendingSyncCount,
      activeElectionsCount,
      candidateVoteCounts,
      recentFlags,
    });
  } catch (err: any) {
    console.error('[Admin Stats API] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
      totalVotes: 0,
      flaggedCount: 0,
      pendingSyncCount: 0,
      activeElectionsCount: 0,
      candidateVoteCounts: [],
      recentFlags: [],
    });
  }
}
