import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { memDb } from '@/lib/inMemoryDb';
import { connectDB } from '@/lib/db';
import { Voter } from '@/models/Voter';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const electionId = searchParams.get('electionId') || '0x3bf3952cfe2b5ae1956147b8f53af6c1e4c8c3122466692b2f15185439baf0d1';

  try {
    let votersList: any[] = [];
    try {
      await connectDB();
      votersList = await Voter.find({ electionId }).lean();
    } catch {}

    if (!votersList || votersList.length === 0) {
      votersList = memDb.getAllVoters(electionId);
    }

    return NextResponse.json({
      success: true,
      electionId,
      total: votersList.length,
      voters: votersList.map((v) => ({
        voterHashId: v.voterHashId,
        name: v.name || 'Unnamed Voter',
        uidHash: v.uidHash ? `${v.uidHash.slice(0, 10)}...${v.uidHash.slice(-8)}` : 'Not linked',
        hasFaceEnrolled: Boolean(v.faceDescriptor && v.faceDescriptor.length > 0 && !v.faceDescriptor.every((x: number) => x === 0)),
        hasVoted: Boolean(v.hasVoted),
        isBlocked: Boolean(v.blockedUntil && new Date(v.blockedUntil) > new Date()),
        registeredAt: v.registeredAt || v.createdAt || new Date(),
        registeredBy: v.registeredBy || 'Admin',
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching voters' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { name, uid, faceDescriptor, electionId, registeredBy } = body;

    if (!name || !uid) {
      return NextResponse.json({ error: 'Name and Card UID are required.' }, { status: 400 });
    }

    const activeElectionId =
      electionId || '0x3bf3952cfe2b5ae1956147b8f53af6c1e4c8c3122466692b2f15185439baf0d1';

    const uidHash = ethers.keccak256(ethers.toUtf8Bytes(uid.trim()));
    const voterHashId = ethers.keccak256(ethers.toUtf8Bytes(name.trim().toLowerCase() + '-salt'));

    // Check duplicate in memDb
    const existing = memDb.findVoterByUidHash(uidHash, activeElectionId);
    if (existing) {
      return NextResponse.json(
        { error: `This card is already linked to registered voter: ${existing.name}` },
        { status: 409 }
      );
    }

    const newVoter = {
      voterHashId,
      electionId: activeElectionId,
      name: name.trim(),
      uidHash,
      faceDescriptor: Array.isArray(faceDescriptor) && faceDescriptor.length > 0 ? faceDescriptor : Array(128).fill(0),
      mfaStatus: {
        otpVerified: true,
        nfcVerified: true,
        faceVerified: Boolean(faceDescriptor && faceDescriptor.length > 0),
      },
      deviceFingerprints: [],
      hasVoted: false,
      failedFaceAttempts: 0,
      registeredAt: new Date(),
      registeredBy: registeredBy || 'Officer at Station #1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memDb.saveVoter(newVoter);

    try {
      await connectDB();
      await Voter.create(newVoter);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Voter ${name} registered successfully with NFC Card UID.`,
      voter: {
        name: newVoter.name,
        voterHashId: newVoter.voterHashId,
        uidHashPreview: `${uidHash.slice(0, 10)}...${uidHash.slice(-8)}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to register voter' }, { status: 500 });
  }
}
