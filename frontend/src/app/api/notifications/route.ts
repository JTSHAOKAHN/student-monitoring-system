import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { supabase, profile } = await getAuthenticatedProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';

  let query = supabase
    .from('notifications')
    .select('id, title, message, type, link, is_read, created_at')
    .eq('user_id', profile.id)
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
  const { supabase, profile } = await getAuthenticatedProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { notificationIds, markAllRead } = await request.json();

  if (markAllRead) {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    return NextResponse.json({ success: true });
  }

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return NextResponse.json({ error: 'notificationIds required' }, { status: 400 });
  }

  await supabase.from('notifications').update({ is_read: true }).in('id', notificationIds).eq('user_id', profile.id);
  return NextResponse.json({ success: true });
}
