import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Pagination parameters
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = (page - 1) * limit;
  
  // Filter parameters
  const examId = searchParams.get('examId');
  const studentId = searchParams.get('studentId');
  const eventType = searchParams.get('eventType');
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');

  const { supabase, profile, teacher } = await getAuthenticatedProfile();

  if (!profile || profile.role !== 'teacher' || !teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Build base query
    let query = supabase
      .from('monitoring_events')
      .select(`
        id,
        event_type,
        details,
        created_at,
        exam_sessions(
          id,
          attempts(
            id,
            exam_id,
            student_id,
            exams(title),
            students(users(full_name))
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters through exam_sessions/attempts
    if (examId) {
      query = query.filter('exam_sessions.attempts.exam_id', 'eq', examId);
    }
    if (studentId) {
      query = query.filter('exam_sessions.attempts.student_id', 'eq', studentId);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    if (startTime) {
      query = query.gte('created_at', startTime);
    }
    if (endTime) {
      query = query.lte('created_at', endTime);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: events, error, count } = await query;

    if (error) {
      console.error('Monitoring events fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch monitoring events' }, { status: 500 });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Flatten the nested structure for easier consumption
    const flattenedEvents = (events || []).map((event: any) => ({
      id: event.id,
      event_type: event.event_type,
      details: event.details,
      created_at: event.created_at,
      exam_id: event.exam_sessions?.attempts?.exam_id,
      student_id: event.exam_sessions?.attempts?.student_id,
      exam_title: event.exam_sessions?.attempts?.exams?.title,
      student_name: event.exam_sessions?.attempts?.students?.users?.full_name,
    }));

    return NextResponse.json({
      events: flattenedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Monitoring events error:', error);
    return NextResponse.json({ error: 'Failed to fetch monitoring events' }, { status: 500 });
  }
}

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
