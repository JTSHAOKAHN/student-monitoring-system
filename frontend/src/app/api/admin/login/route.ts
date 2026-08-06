import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminSessionToken, verifyAdminCredentials } from '@/lib/admin';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json({ error: 'Invalid administrator credentials.' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const token = createAdminSessionToken(username);
    cookieStore.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to sign in.' }, { status: 500 });
  }
}
