import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { studentNumber, passcode } = await request.json();
    const sNum = Number(studentNumber);

    if (!sNum || sNum < 1 || sNum > 35) {
      return NextResponse.json({ error: 'Invalid student number. Must be between 1 and 35.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service client unavailable.' }, { status: 500 });
    }

    // Check or find student 1..35
    let { data: student } = await supabase
      .from('students')
      .select('id, user_id, student_number, display_name, passcode, users(full_name, email)')
      .eq('student_number', sNum)
      .maybeSingle();

    // If student 1..35 row doesn't exist yet, seed on demand
    if (!student) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          full_name: `Student ${sNum}`,
          email: `student${sNum}@school.internal`,
          role: 'student',
        })
        .select('id')
        .single();

      if (newUser) {
        const { data: newStudent } = await supabase
          .from('students')
          .insert({
            user_id: newUser.id,
            student_id: `STU-${String(sNum).padStart(3, '0')}`,
            student_number: sNum,
            display_name: `Student ${sNum}`,
            passcode: 'student123',
            class_name: 'Classroom 1',
          })
          .select('id, user_id, student_number, display_name, passcode, users(full_name, email)')
          .single();

        student = newStudent;
      }
    }

    if (!student) {
      return NextResponse.json({ error: 'Unable to initialize student account.' }, { status: 500 });
    }

    if (passcode && student.passcode && passcode !== student.passcode) {
      return NextResponse.json({ error: 'Incorrect student passcode.' }, { status: 401 });
    }

    // Update presence
    const now = new Date().toISOString();
    await supabase
      .from('students')
      .update({
        is_logged_in: true,
        last_login_at: now,
        last_activity_at: now,
      })
      .eq('id', student.id);

    // Set HTTP-only session cookie
    const cookieStore = await cookies();
    cookieStore.set(
      'student_session',
      JSON.stringify({
        studentId: student.id,
        userId: student.user_id,
        studentNumber: student.student_number,
        displayName: student.display_name || `Student ${student.student_number}`,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 hours
      }
    );

    return NextResponse.json({ ok: true, studentNumber: student.student_number, displayName: student.display_name });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Login error occurred.' }, { status: 500 });
  }
}
