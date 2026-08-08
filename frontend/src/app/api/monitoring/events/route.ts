import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId, events } = await request.json();

  if (!sessionId || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { data: session } = await supabase
    .from('exam_sessions')
    .select('id, attempt_id')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const rows = events.map((event: { event_type: string; details?: Record<string, unknown>; created_at?: string }) => ({
    exam_session_id: sessionId,
    event_type: event.event_type,
    details: event.details || null,
    created_at: event.created_at || new Date().toISOString(),
  }));

  const { error } = await supabase.from('monitoring_events').insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, count: rows.length });
}
