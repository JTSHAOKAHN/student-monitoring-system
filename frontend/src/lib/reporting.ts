import { createSupabaseServiceClient } from './supabase-server';

export async function getAdminOverview() {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      overview: { users: 0, teachers: 0, students: 0, exams: 0, attempts: 0, flagged: 0 },
      activity: [],
      audit: [],
      users: [],
      exams: [],
      recentNotifications: [],
    };
  }

  const [usersResult, teachersResult, studentsResult, examsResult, attemptsResult, flaggedResult] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('teachers').select('id', { count: 'exact', head: true }),
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('exams').select('id', { count: 'exact', head: true }),
    supabase.from('attempts').select('id', { count: 'exact', head: true }),
    supabase.from('analytics').select('id', { count: 'exact', head: true }).gte('cheating_risk', 40),
  ]);

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, role, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: exams } = await supabase
    .from('exams')
    .select('id, title, published, created_at, teachers(user_id, users(full_name))')
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: recentAttempts } = await supabase
    .from('attempts')
    .select('id, status, score, submitted_at, exams(title), students(users(full_name))')
    .order('started_at', { ascending: false })
    .limit(15);

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, type, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    overview: {
      users: usersResult.count ?? 0,
      teachers: teachersResult.count ?? 0,
      students: studentsResult.count ?? 0,
      exams: examsResult.count ?? 0,
      attempts: attemptsResult.count ?? 0,
      flagged: flaggedResult.count ?? 0,
    },
    activity: (recentAttempts || []).map((a) => ({
      title: (a.students as { users?: { full_name?: string } })?.users?.full_name || 'Student',
      detail: `${(a.exams as { title?: string })?.title || 'Exam'} — ${a.status}${a.score != null ? ` (${a.score}%)` : ''}`,
    })),
    audit: (exams || []).slice(0, 5).map((e) => ({
      title: e.title,
      detail: e.published ? 'Published' : 'Draft',
    })),
    users: users || [],
    exams: exams || [],
    recentNotifications: notifications || [],
  };
}

export async function generateExamCsvReport(examId: string): Promise<string> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return 'Error: Supabase service client not available';
  }

  const { data: exam } = await supabase.from('exams').select('title').eq('id', examId).single();
  const { data: attempts } = await supabase
    .from('attempts')
    .select('id, status, score, started_at, submitted_at, students(users(full_name, email))')
    .eq('exam_id', examId);

  const { data: analyticsList } = await supabase
    .from('analytics')
    .select('attempt_id, focus_score, cheating_risk, completion_rate, avg_time_seconds')
    .eq('exam_id', examId);

  const analyticsMap = new Map((analyticsList || []).map((a) => [a.attempt_id, a]));

  const headers = ['Student Name', 'Email', 'Status', 'Score (%)', 'Focus Score (%)', 'Cheating Risk (%)', 'Completion Rate (%)', 'Started At', 'Submitted At'];
  const rows = (attempts || []).map((att) => {
    const student = att.students as { users?: { full_name?: string; email?: string } } | null;
    const stats = analyticsMap.get(att.id);

    return [
      `"${student?.users?.full_name || 'Student'}"`,
      `"${student?.users?.email || 'N/A'}"`,
      att.status,
      att.score ?? 'N/A',
      stats?.focus_score ?? 'N/A',
      stats?.cheating_risk ?? 'N/A',
      stats?.completion_rate ?? 'N/A',
      att.started_at ? `"${new Date(att.started_at).toLocaleString()}"` : 'N/A',
      att.submitted_at ? `"${new Date(att.submitted_at).toLocaleString()}"` : 'N/A',
    ].join(',');
  });

  return [`# Exam Report: "${exam?.title || 'Exam'}"`, headers.join(','), ...rows].join('\n');
}

