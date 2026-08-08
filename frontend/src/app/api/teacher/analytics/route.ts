import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function GET() {
  const { supabase, profile, teacher } = await getAuthenticatedProfile();

  if (!profile || profile.role !== 'teacher' || !teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: exams } = await supabase
    .from('exams')
    .select('id, title, published')
    .eq('teacher_id', teacher.id);

  const examIds = (exams || []).map((e) => e.id);

  if (examIds.length === 0) {
    return NextResponse.json({
      cards: {
        totalExams: 0,
        publishedExams: 0,
        activeSessions: 0,
        avgFocusScore: 0,
        avgCheatingRisk: 0,
        flaggedStudents: 0,
        completionRate: 0,
      },
      recentAttempts: [],
    });
  }

  const { data: analytics } = await supabase
    .from('analytics')
    .select('focus_score, cheating_risk, completion_rate, exam_id, student_id, attempt_id')
    .in('exam_id', examIds);

  const { data: inProgress } = await supabase
    .from('attempts')
    .select('id')
    .in('exam_id', examIds)
    .eq('status', 'in_progress');

  const analyticsRows = analytics || [];
  const avgFocus = analyticsRows.length
    ? Math.round(analyticsRows.reduce((s, a) => s + Number(a.focus_score || 0), 0) / analyticsRows.length)
    : 0;
  const avgRisk = analyticsRows.length
    ? Math.round(analyticsRows.reduce((s, a) => s + Number(a.cheating_risk || 0), 0) / analyticsRows.length)
    : 0;
  const avgCompletion = analyticsRows.length
    ? Math.round(analyticsRows.reduce((s, a) => s + Number(a.completion_rate || 0), 0) / analyticsRows.length)
    : 0;
  const flagged = analyticsRows.filter((a) => Number(a.cheating_risk) >= 40).length;

  const { data: recentAttempts } = await supabase
    .from('attempts')
    .select('id, status, score, submitted_at, exams(title), students(user_id, users(full_name))')
    .in('exam_id', examIds)
    .order('started_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    cards: {
      totalExams: exams?.length ?? 0,
      publishedExams: exams?.filter((e) => e.published).length ?? 0,
      activeSessions: inProgress?.length ?? 0,
      avgFocusScore: avgFocus,
      avgCheatingRisk: avgRisk,
      flaggedStudents: flagged,
      completionRate: avgCompletion,
    },
    recentAttempts: recentAttempts || [],
  });
}
