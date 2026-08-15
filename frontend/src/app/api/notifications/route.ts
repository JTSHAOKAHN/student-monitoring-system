import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthenticatedProfile } from '@/lib/supabase-server';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

async function getUserId() {
  // First try Supabase Auth (for teachers)
  const { profile } = await getAuthenticatedProfile();
  if (profile) {
    return profile.id;
  }

  // Then try student session (for students)
  const cookieStore = await cookies();
  const studentSession = cookieStore.get('student_session');
  if (studentSession) {
    const session = JSON.parse(studentSession.value);
    // Need to get the user_id from the students table
    const supabase = createSupabaseServiceClient();
    if (supabase) {
      const { data: student } = await supabase
        .from('students')
        .select('user_id')
        .eq('id', session.studentId)
        .maybeSingle();
      return student?.user_id;
    }
  }

  return null;
}

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';

  let query = supabase
    .from('notifications')
    .select('id, title, message, type, link, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ notifications: data || [] });
}

export async function PATCH(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
  }

  const { notificationIds, markAllRead } = await request.json();

  if (markAllRead) {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    return NextResponse.json({ success: true });
  }

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return NextResponse.json({ error: 'notificationIds required' }, { status: 400 });
  }

  await supabase.from('notifications').update({ is_read: true }).in('id', notificationIds).eq('user_id', userId);
  return NextResponse.json({ success: true });
}
