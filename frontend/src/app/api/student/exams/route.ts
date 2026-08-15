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
      .select('id, title, description, published')
      .eq('published', true);

    if (error) {
      console.error('Exams query error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('Exams loaded:', exams);

    const { data: attempts, error: attemptsError } = await supabase
      .from('attempts')
      .select('id, exam_id, status')
      .eq('student_id', student.id);

    if (attemptsError) {
      console.error('Attempts query error:', attemptsError);
    }

    const attemptMap = new Map((attempts || []).map((a) => [a.exam_id, a]));

    const summaries = (exams || []).map((exam) => {
      const attempt = attemptMap.get(exam.id);

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration_minutes: 60, // Default value since column doesn't exist
        question_count: 0, // Default since we can't count without questions table
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
