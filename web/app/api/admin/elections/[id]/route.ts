import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { extractBearerToken, verifyAdminToken } from '@/lib/auth';
import { getElectionContract } from '@/lib/chain';
import { ElectionMeta } from '@/models/ElectionMeta';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const electionId = params.id;
  const rawToken = extractBearerToken(req.headers.get('authorization'));
  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = verifyAdminToken(rawToken);
    if (admin.role !== 'ELECTION_ADMIN' && admin.role !== 'OFFICIAL') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

  const { action } = body; // 'open' | 'close' | 'audit'

  try {
    const contract = await getElectionContract();
    await connectDB();

    if (action === 'open') {
      const tx = await contract.openElection(electionId);
      await tx.wait();
      await ElectionMeta.updateOne({ electionId }, { status: 'Open' });
    } else if (action === 'close') {
      const tx = await contract.closeElection(electionId);
      await tx.wait();
      await ElectionMeta.updateOne({ electionId }, { status: 'Closed' });
    } else if (action === 'audit') {
      const tx = await contract.markAudited(electionId);
      await tx.wait();
      await ElectionMeta.updateOne({ electionId }, { status: 'Audited' });
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be open, close, or audit.' }, { status: 400 });
    }

    const updated = await ElectionMeta.findOne({ electionId });
    return NextResponse.json({ success: true, election: updated });
  } catch (err: any) {
    console.error('[Admin Election Action] Error:', err);
    return NextResponse.json({ error: err.reason || err.message }, { status: 500 });
  }
}
