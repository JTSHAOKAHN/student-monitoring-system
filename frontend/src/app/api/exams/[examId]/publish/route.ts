import { NextResponse } from 'next/server';
import { notifyStudentsOfPublishedExam } from '@/lib/notifications';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function POST(_request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const { supabase, profile, teacher } = await getAuthenticatedProfile();

  if (!profile || profile.role !== 'teacher' || !teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: exam, error } = await supabase
    .from('exams')
    .update({ published: true, published_at: new Date().toISOString() })
    .eq('id', examId)
    .eq('teacher_id', teacher.id)
    .select('id, title')
    .single();

  if (error || !exam) {
    return NextResponse.json({ error: error?.message || 'Failed to publish' }, { status: 400 });
  }

  await notifyStudentsOfPublishedExam(exam.id, exam.title);

  return NextResponse.json({ success: true, exam });
}
