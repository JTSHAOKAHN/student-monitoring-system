import { NextResponse } from 'next/server';
import { computeAnalytics } from '@/lib/analytics-engine';
import { createNotification, notifyTeacherStudentFlagged } from '@/lib/notifications';
import { getAuthenticatedProfile, createSupabaseServiceClient } from '@/lib/supabase-server';

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const { supabase, profile, student } = await getAuthenticatedProfile();

  if (!profile || profile.role !== 'student' || !student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { responses } = await request.json() as { responses: Array<{ questionId: string; response: string }> };

  const { data: attempt } = await supabase
    .from('attempts')
    .select('id, exam_id, student_id, started_at, status')
    .eq('id', attemptId)
    .eq('student_id', student.id)
    .single();

  if (!attempt || attempt.status === 'submitted') {
    return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 });
  }

  const { data: questions } = await supabase
    .from('questions')
    .select('id, correct_answer, question_type')
    .eq('exam_id', attempt.exam_id);

  const questionMap = new Map((questions || []).map((q) => [q.id, q]));

  let correctCount = 0;
  const responseRows = (responses || []).map((r) => {
    const q = questionMap.get(r.questionId);
    const isCorrect = q?.correct_answer ? r.response.trim().toLowerCase() === q.correct_answer.trim().toLowerCase() : null;
    if (isCorrect) {
      correctCount += 1;
    }
    return {
      attempt_id: attemptId,
      question_id: r.questionId,
      response: r.response,
      is_correct: isCorrect,
    };
  });

  if (responseRows.length > 0) {
    await supabase.from('student_responses').upsert(responseRows, { onConflict: 'attempt_id,question_id' });
  }

  const submittedAt = new Date();
  const durationSeconds = Math.round((submittedAt.getTime() - new Date(attempt.started_at).getTime()) / 1000);
  const score = questions && questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : null;

  await supabase
    .from('attempts')
    .update({ status: 'submitted', submitted_at: submittedAt.toISOString(), score })
    .eq('id', attemptId);

  const { data: session } = await supabase
    .from('exam_sessions')
    .select('id')
    .eq('attempt_id', attemptId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let events: Array<{ event_type: string; details: Record<string, unknown> | null; created_at: string }> = [];
  if (session) {
    await supabase.from('exam_sessions').update({ ended_at: submittedAt.toISOString() }).eq('id', session.id);
    await supabase.from('monitoring_events').insert({
      exam_session_id: session.id,
      event_type: 'exam_submitted',
      details: { score, durationSeconds },
    });

    const { data: eventRows } = await supabase
      .from('monitoring_events')
      .select('event_type, details, created_at')
      .eq('exam_session_id', session.id)
      .order('created_at', { ascending: true });

    events = eventRows || [];
  }

  const analytics = computeAnalytics(
    events.map((e) => ({ event_type: e.event_type as never, details: e.details || undefined, created_at: e.created_at })),
    questions?.length || 0,
    responseRows.length,
    durationSeconds
  );

  await supabase.from('analytics').upsert({
    exam_id: attempt.exam_id,
    student_id: student.id,
    attempt_id: attemptId,
    focus_score: analytics.focusScore,
    cheating_risk: analytics.cheatingRisk,
    completion_rate: analytics.completionRate,
    avg_time_seconds: analytics.avgTimeSeconds,
    heatmap_data: analytics.heatmap,
    event_summary: { flaggedEvents: analytics.flaggedEvents },
  }, { onConflict: 'attempt_id' });

  await createNotification({
    userId: profile.id,
    title: 'Exam submitted',
    message: 'Your exam was submitted successfully. Your teacher will review the results.',
    type: 'exam_finished',
    link: '/student',
  });

  if (analytics.cheatingRisk >= 40) {
    const service = createSupabaseServiceClient();
    const { data: exam } = await supabase.from('exams').select('title, teacher_id').eq('id', attempt.exam_id).single();
    if (exam && service) {
      const { data: teacher } = await service
        .from('teachers')
        .select('user_id, users(full_name, email)')
        .eq('id', exam.teacher_id)
        .single();

      const teacherUser = teacher?.users as { full_name?: string; email?: string } | null;
      if (teacher?.user_id && teacherUser?.email) {
        await notifyTeacherStudentFlagged(
          teacher.user_id,
          teacherUser.email,
          profile.full_name,
          exam.title,
          attemptId
        );
      }
    }
  }

  return NextResponse.json({ success: true, score, analytics });
}
