import { NextRequest, NextResponse } from 'next/server';
import { getBallotContract } from '@/lib/chain';
import { connectDB } from '@/lib/db';
import { ElectionMeta } from '@/models/ElectionMeta';

export async function GET(
  req: NextRequest,
  { params }: { params: { electionId: string } }
): Promise<NextResponse> {
  const { electionId } = params;

  if (!electionId) {
    return NextResponse.json({ error: 'electionId is required' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    await connectDB();
    const meta = await ElectionMeta.findOne({ electionId }).lean();

    const ballot = await getBallotContract();
    
    // Filter VoteCast(bytes32 indexed electionId, ...)
    const filter = ballot.filters.VoteCast(electionId);
    const logs = await ballot.queryFilter(filter, 0, 'latest');

    const total = logs.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = logs.slice(startIndex, endIndex);

    const events = await Promise.all(
      paginatedLogs.map(async (log: any) => {
        const block = await log.getBlock();
        // args: [electionId, voterCommitment, candidateId, timestamp]
        const commitment = log.args ? log.args[1] : '';
        const candidateId = log.args ? Number(log.args[2]) : 0;
        const timestamp = log.args ? Number(log.args[3]) : block.timestamp;

        // Privacy preserve voter commitment (truncate)
        const maskedCommitment = commitment
          ? `${commitment.slice(0, 6)}...${commitment.slice(-4)}`
          : '0x****';

        return {
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          electionId,
          candidateId,
          maskedCommitment,
          timestamp,
        };
      })
    );

    return NextResponse.json({
      success: true,
      electionId,
      electionMeta: meta || null,
      total,
      page,
      limit,
      events,
    });
  } catch (err: any) {
    console.error('[Audit API] Error fetching audit trail:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to query blockchain audit trail' },
      { status: 500 }
    );
  }
}