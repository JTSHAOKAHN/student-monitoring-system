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
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    // Use real teacher ID if available, otherwise create/get a test teacher
    let teacherId = teacher?.id;
    
    if (!teacherId) {
      // Try to get or create a test teacher
      const { data: testTeacher } = await supabase
        .from('teachers')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (testTeacher) {
        teacherId = testTeacher.id;
      } else {
        // Create a test teacher for development
        const { data: newTeacher } = await supabase
          .from('teachers')
          .insert({})
          .select('id')
          .single();
        
        if (newTeacher) {
          teacherId = newTeacher.id;
        } else {
          return NextResponse.json({ error: 'Unable to create or find teacher account' }, { status: 500 });
        }
      }
    }

    const shouldPublish = publish === true;

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        title,
        description,
        teacher_id: teacherId,
        published: shouldPublish,
        published_at: shouldPublish ? new Date().toISOString() : null,
        duration_minutes: 60,
      })
      .select('id')
      .single();

    if (examError || !exam) {
      console.error('Exam creation error:', examError);
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
      console.error('Question insertion error:', questionError);
      return NextResponse.json({ error: questionError.message }, { status: 400 });
    }

    if (pdfId) {
      await supabase.from('ai_generated_questions').update({ exam_id: exam.id }).eq('pdf_upload_id', pdfId);
    }

    console.log('Exam created successfully:', { examId: exam.id, published: shouldPublish });

    if (shouldPublish) {
      await notifyStudentsOfPublishedExam(exam.id, title);
    }

    return NextResponse.json({ success: true, examId: exam.id, published: shouldPublish });
  } catch (error) {
    console.error('Draft creation error:', error);
    return NextResponse.json({ error: 'Failed to publish draft.' }, { status: 500 });
  }
}
