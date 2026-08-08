import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function GET() {
  const { supabase, profile, teacher } = await getAuthenticatedProfile();

  if (!profile || profile.role !== 'teacher' || !teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all 35 students with their status
  const { data: students, error } = await supabase
    .from('students')
    .select('id, student_number, display_name, is_logged_in, last_login_at, last_activity_at, current_session_id, users(full_name, email)')
    .order('student_number', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Get current active attempts for each student
  const { data: attempts } = await supabase
    .from('attempts')
    .select('id, student_id, exam_id, status, started_at, submitted_at, exams(title)')
    .in('status', ['in_progress', 'submitted']);

  // Create a map of student_id to their latest attempt
  const attemptMap = new Map();
  (attempts || []).forEach((attempt) => {
    const existing = attemptMap.get(attempt.student_id);
    if (!existing || new Date(attempt.started_at) > new Date(existing.started_at)) {
      attemptMap.set(attempt.student_id, attempt);
    }
  });

  // Calculate status for each student
  const now = new Date();
  const studentsWithStatus = (students || []).map((student) => {
    const attempt = attemptMap.get(student.id);
    const lastActivity = student.last_activity_at ? new Date(student.last_activity_at) : null;
    const isIdle = lastActivity && (now.getTime() - lastActivity.getTime()) > 5 * 60 * 1000; // 5 minutes
    const isDisconnected = lastActivity && (now.getTime() - lastActivity.getTime()) > 15 * 60 * 1000; // 15 minutes

    let status = 'not_logged_in';
    if (student.is_logged_in) {
      if (attempt && attempt.status === 'in_progress') {
        status = 'writing_exam';
      } else if (isDisconnected) {
        status = 'disconnected';
      } else if (isIdle) {
        status = 'idle';
      } else {
        status = 'active';
      }
    } else if (attempt && attempt.status === 'submitted') {
      status = 'exam_completed';
    }

    return {
      id: student.id,
      student_number: student.student_number,
      display_name: student.display_name,
      is_logged_in: student.is_logged_in,
      last_login_at: student.last_login_at,
      last_activity_at: student.last_activity_at,
      status,
      current_exam: attempt?.exams?.title || null,
      attempt_id: attempt?.id || null,
      last_activity_text: lastActivity 
        ? getTimeAgo(lastActivity) 
        : 'Never',
    };
  });

  // Calculate summary statistics
  const total = studentsWithStatus.length;
  const loggedIn = studentsWithStatus.filter(s => s.is_logged_in).length;
  const writing = studentsWithStatus.filter(s => s.status === 'writing_exam').length;
  const notStarted = studentsWithStatus.filter(s => s.status === 'not_logged_in').length;
  const disconnected = studentsWithStatus.filter(s => s.status === 'disconnected').length;
  const completed = studentsWithStatus.filter(s => s.status === 'exam_completed').length;

  return NextResponse.json({
    students: studentsWithStatus,
    summary: {
      total,
      logged_in: loggedIn,
      writing,
      not_started: notStarted,
      disconnected,
      completed,
    },
  });
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
