import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSessionToken } from '@/lib/admin';
import { getAdminOverview } from '@/lib/reporting';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(await getAdminOverview());
}
