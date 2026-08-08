import { NextResponse } from 'next/server';
import { notifyStudentsOfPublishedExam } from '@/lib/notifications';
import { getAuthenticatedProfile } from '@/lib/supabase-server';
import type { GeneratedQuestion } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, questions, pdfId, publish } = body as {
      title: string;
      description: string;
      questions: GeneratedQuestion[] | string[];
      pdfId?: string;
      publish?: boolean;
    };

    if (!title || !description || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Invalid draft payload.' }, { status: 400 });
    }

    const { supabase, profile, teacher } = await getAuthenticatedProfile();

    if (!profile || profile.role !== 'teacher' || !teacher) {
      return NextResponse.json({ error: 'Only teachers can publish drafts.' }, { status: 403 });
    }

    const shouldPublish = publish === true;

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        title,
        description,
        teacher_id: teacher.id,
        published: shouldPublish,
        published_at: shouldPublish ? new Date().toISOString() : null,
        duration_minutes: 60,
      })
      .select('id')
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: examError?.message || 'Failed to create exam.' }, { status: 400 });
    }

    const questionRows = questions.map((question, index) => {
      if (typeof question === 'string') {
        return {
          exam_id: exam.id,
          prompt: question,
          question_type: 'short_answer',
          difficulty: 'medium',
          order_index: index,
        };
      }

      return {
        exam_id: exam.id,
        prompt: question.prompt,
        question_type: question.question_type,
        options: question.options || null,
        correct_answer: question.correct_answer || null,
        difficulty: question.difficulty || 'medium',
        order_index: index,
      };
    });

    const { error: questionError } = await supabase.from('questions').insert(questionRows);
    if (questionError) {
      return NextResponse.json({ error: questionError.message }, { status: 400 });
    }

    if (pdfId) {
      await supabase.from('ai_generated_questions').update({ exam_id: exam.id }).eq('pdf_upload_id', pdfId);
    }

    if (shouldPublish) {
      await notifyStudentsOfPublishedExam(exam.id, title);
    }

    return NextResponse.json({ success: true, examId: exam.id, published: shouldPublish });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to publish draft.' }, { status: 500 });
  }
}
