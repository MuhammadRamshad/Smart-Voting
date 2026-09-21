import { NextRequest, NextResponse } from 'next/server';
import { memDb } from '@/lib/inMemoryDb';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const voterHashId = params.id;
  try {
    const body = await req.json();
    const { action, electionId } = body;
    const activeElectionId =
      electionId || '0x3bf3952cfe2b5ae1956147b8f53af6c1e4c8c3122466692b2f15185439baf0d1';

    const voter = memDb.getVoter(voterHashId, activeElectionId);
    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    if (action === 'unblock') {
      voter.blockedUntil = undefined;
      voter.failedFaceAttempts = 0;
    } else if (action === 'reset_vote') {
      voter.hasVoted = false;
      voter.mfaStatus.faceVerified = false;
    }

    memDb.saveVoter(voter);
    return NextResponse.json({ success: true, voter });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
