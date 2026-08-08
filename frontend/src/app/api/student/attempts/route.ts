import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const { supabase, profile, student } = await getAuthenticatedProfile();

  if (!profile || profile.role !== 'student' || !student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { examId } = await request.json();
  if (!examId) {
    return NextResponse.json({ error: 'examId is required' }, { status: 400 });
  }

  const { data: exam } = await supabase.from('exams').select('id, published').eq('id', examId).eq('published', true).single();
  if (!exam) {
    return NextResponse.json({ error: 'Exam not available' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('attempts')
    .select('id, status')
    .eq('exam_id', examId)
    .eq('student_id', student.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'submitted') {
      return NextResponse.json({ error: 'Exam already submitted' }, { status: 400 });
    }

    const { data: session } = await supabase
      .from('exam_sessions')
      .select('id')
      .eq('attempt_id', existing.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ attemptId: existing.id, sessionId: session?.id ?? null, resumed: true });
  }

  const { data: attempt, error: attemptError } = await supabase
    .from('attempts')
    .insert({ exam_id: examId, student_id: student.id, status: 'in_progress' })
    .select('id')
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: attemptError?.message || 'Failed to start attempt' }, { status: 400 });
  }

  const userAgent = request.headers.get('user-agent') || 'unknown';
  const { data: session, error: sessionError } = await supabase
    .from('exam_sessions')
    .insert({
      attempt_id: attempt.id,
      device: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      browser: userAgent.slice(0, 120),
    })
    .select('id')
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message || 'Failed to create session' }, { status: 400 });
  }

  return NextResponse.json({ attemptId: attempt.id, sessionId: session.id, resumed: false });
}
