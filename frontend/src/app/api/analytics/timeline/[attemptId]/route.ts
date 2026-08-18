import { NextResponse } from 'next/server';
import { formatTimelineEntry } from '@/lib/analytics-engine';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function GET(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const { searchParams } = new URL(request.url);
  
  // Pagination parameters
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = (page - 1) * limit;
  
  // Filter parameters
  const eventType = searchParams.get('eventType');
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');

  const { supabase, profile, teacher, student } = await getAuthenticatedProfile();

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'student')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: attempt } = await supabase
    .from('attempts')
    .select('id, exam_id, student_id, score, started_at, submitted_at, status, exams(title, teacher_id), students(users(full_name, email))')
    .eq('id', attemptId)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  }

  if (profile.role === 'teacher') {
    const examData = attempt.exams as { title?: string; teacher_id?: string } | null;
    if (!teacher || examData?.teacher_id !== teacher.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (profile.role === 'student') {
    if (!student || attempt.student_id !== student.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { data: session } = await supabase
    .from('exam_sessions')
    .select('id, started_at, ended_at, device, browser')
    .eq('attempt_id', attemptId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let timeline: ReturnType<typeof formatTimelineEntry>[] = [];
  let totalCount = 0;
  
  if (session) {
    // Build query with filters
    let query = supabase
      .from('monitoring_events')
      .select('event_type, details, created_at', { count: 'exact' })
      .eq('exam_session_id', session.id)
      .order('created_at', { ascending: true });

    // Apply filters
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
      console.error('Timeline fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
    }

    timeline = (events || []).map((e) =>
      formatTimelineEntry({
        event_type: e.event_type as never,
        details: e.details || undefined,
        created_at: e.created_at,
      })
    );
    
    totalCount = count || 0;
  }

  const { data: analytics } = await supabase
    .from('analytics')
    .select('*')
    .eq('attempt_id', attemptId)
    .maybeSingle();

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({ 
    attempt, 
    session, 
    timeline, 
    analytics,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
}
