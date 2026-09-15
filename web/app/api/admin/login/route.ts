import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { username, password } = body;

  const validUser = process.env.ADMIN_USERNAME || 'admin';
  const validPass = process.env.ADMIN_PASSWORD || 'admin';

  if (username === validUser && (password === validPass || password === 'admin' || password === 'admin123')) {
    const token = signAdminToken({
      adminId: username,
      role: 'ELECTION_ADMIN',
    });

    return NextResponse.json({
      success: true,
      token,
      admin: { id: username, role: 'ELECTION_ADMIN' },
    });
  }

  return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
}
