import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, questions, pdfId } = body;

    if (!title || !description || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Invalid draft payload.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can publish drafts.' }, { status: 403 });
    }

    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (teacherError || !teacher) {
      return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });
    }

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        title,
        description,
        teacher_id: teacher.id,
        published: false,
      })
      .select('id')
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: examError?.message || 'Failed to create exam.' }, { status: 400 });
    }

    const questionRows = questions.map((question: string) => ({
      exam_id: exam.id,
      prompt: question,
      question_type: 'short_answer',
      difficulty: 'medium',
    }));

    const { error: questionError } = await supabase.from('questions').insert(questionRows);
    if (questionError) {
      return NextResponse.json({ error: questionError.message }, { status: 400 });
    }

    if (pdfId) {
      await supabase.from('ai_generated_questions').update({ exam_id: exam.id }).eq('pdf_upload_id', pdfId);
    }

    return NextResponse.json({ success: true, examId: exam.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to publish draft.' }, { status: 500 });
  }
}
