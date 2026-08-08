import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function GET(_request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const { supabase, profile, student } = await getAuthenticatedProfile();

  if (!profile || profile.role !== 'student' || !student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: exam, error } = await supabase
    .from('exams')
    .select('id, title, description, duration_minutes, published')
    .eq('id', examId)
    .eq('published', true)
    .single();

  if (error || !exam) {
    return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
  }

  const { data: questions } = await supabase
    .from('questions')
    .select('id, prompt, question_type, options, order_index')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true });

  const { data: attempt } = await supabase
    .from('attempts')
    .select('id, status')
    .eq('exam_id', examId)
    .eq('student_id', student.id)
    .maybeSingle();

  let sessionId = null;
  if (attempt) {
    const { data: session } = await supabase
      .from('exam_sessions')
      .select('id')
      .eq('attempt_id', attempt.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    sessionId = session?.id ?? null;
  }

  return NextResponse.json({ exam, questions: questions || [], attempt, sessionId });
}
