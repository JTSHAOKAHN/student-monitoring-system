import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function GET(_request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const { supabase, profile, teacher } = await getAuthenticatedProfile();

  if (!profile || profile.role !== 'teacher' || !teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: exam } = await supabase
    .from('exams')
    .select('id, title')
    .eq('id', examId)
    .eq('teacher_id', teacher.id)
    .single();

  if (!exam) {
    return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
  }

  const { data: analytics } = await supabase
    .from('analytics')
    .select('*, students(user_id, users(full_name, email))')
    .eq('exam_id', examId);

  const { data: attempts } = await supabase
    .from('attempts')
    .select('id, status, score, submitted_at, students(users(full_name))')
    .eq('exam_id', examId);

  return NextResponse.json({ exam, analytics: analytics || [], attempts: attempts || [] });
}
