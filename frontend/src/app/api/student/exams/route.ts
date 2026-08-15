import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const studentSession = cookieStore.get('student_session');
    
    if (!studentSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(studentSession.value);
    const { studentId } = session;

    const supabase = createSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    // Verify student exists
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: exams, error } = await supabase
      .from('exams')
      .select('id, title, description, duration_minutes, published, questions(count)')
      .eq('published', true)
      .order('published_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: attempts } = await supabase
      .from('attempts')
      .select('id, exam_id, status')
      .eq('student_id', student.id);

    const attemptMap = new Map((attempts || []).map((a) => [a.exam_id, a]));

    const summaries = (exams || []).map((exam) => {
      const attempt = attemptMap.get(exam.id);
      const countRow = exam.questions as { count: number }[] | undefined;
      const questionCount = countRow?.[0]?.count ?? 0;

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration_minutes: exam.duration_minutes ?? 60,
        question_count: questionCount,
        attempt_status: attempt?.status ?? null,
        attempt_id: attempt?.id ?? null,
      };
    });

    return NextResponse.json({ exams: summaries });
  } catch (error) {
    console.error('Student exams error:', error);
    return NextResponse.json({ error: 'Failed to load exams' }, { status: 500 });
  }
}
