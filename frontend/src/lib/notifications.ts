import { resend } from './resend';
import { createSupabaseServiceClient } from './supabase-server';
import type { NotificationType } from './types';

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  sendEmail?: boolean;
  email?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: 'Supabase service client not configured.' };
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      link: input.link || null,
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (input.sendEmail && input.email && resend) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ExamGuardian <onboarding@resend.dev>',
      to: [input.email],
      subject: input.title,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#0891b2;">${input.title}</h2>
        <p style="color:#334155;line-height:1.6;">${input.message}</p>
        ${input.link ? `<p><a href="${input.link}" style="color:#0891b2;">Open in ExamGuardian</a></p>` : ''}
      </div>`,
    });
  }

  return { ok: true, id: data.id };
}

export async function notifyStudentsOfPublishedExam(examId: string, examTitle: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  const { data: students } = await supabase
    .from('students')
    .select('id, user_id, users(full_name, email)')
    .limit(500);

  for (const student of students || []) {
    const user = student.users as { full_name?: string; email?: string } | null;
    if (!user?.email) {
      continue;
    }

    await createNotification({
      userId: student.user_id,
      title: 'New exam available',
      message: `"${examTitle}" has been published and is ready to take.`,
      type: 'exam_published',
      link: `/student/exam/${examId}`,
      sendEmail: true,
      email: user.email,
    });
  }
}

export async function notifyTeacherStudentFlagged(
  teacherUserId: string,
  teacherEmail: string,
  studentName: string,
  examTitle: string,
  attemptId: string
) {
  await createNotification({
    userId: teacherUserId,
    title: 'Student flagged during exam',
    message: `${studentName} triggered suspicious activity during "${examTitle}". Review the activity timeline.`,
    type: 'student_flagged',
    link: `/teacher/timeline/${attemptId}`,
    sendEmail: true,
    email: teacherEmail,
  });
}
