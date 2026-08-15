import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { studentNumber, passcode } = await request.json();
    const sNum = Number(studentNumber);

    console.log('Student login attempt:', { studentNumber: sNum, hasPasscode: !!passcode });

    if (!sNum || sNum < 1 || sNum > 35) {
      return NextResponse.json({ error: 'Invalid student number. Must be between 1 and 35.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    if (!supabase) {
      console.error('Supabase service client unavailable');
      return NextResponse.json({ error: 'Database service client unavailable.' }, { status: 500 });
    }

    console.log('Supabase client created successfully');

    // Check or find student 1..35
    let { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, user_id, student_number, display_name, passcode, users(full_name, email)')
      .eq('student_number', sNum)
      .maybeSingle();

    console.log('Student query result:', { student, error: studentError });

    // If student 1..35 row doesn't exist yet, seed on demand
    if (!student) {
      console.log('Student not found, creating new student account...');
      
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          full_name: `Student ${sNum}`,
          email: `student${sNum}@school.internal`,
          role: 'student',
        })
        .select('id')
        .single();

      console.log('User creation result:', { newUser, error: userError });

      if (newUser) {
        const { data: newStudent, error: newStudentError } = await supabase
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

        console.log('Student creation result:', { newStudent, error: newStudentError });
        student = newStudent;
      }
    }

    if (!student) {
      console.error('Unable to initialize student account');
      return NextResponse.json({ error: 'Unable to initialize student account.' }, { status: 500 });
    }

    if (passcode && student.passcode && passcode !== student.passcode) {
      console.log('Incorrect passcode');
      return NextResponse.json({ error: 'Incorrect student passcode.' }, { status: 401 });
    }

    // Update presence
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('students')
      .update({
        is_logged_in: true,
        last_login_at: now,
        last_activity_at: now,
      })
      .eq('id', student.id);

    console.log('Student update result:', { error: updateError });

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

    console.log('Student login successful:', { studentNumber: student.student_number, displayName: student.display_name });
    return NextResponse.json({ ok: true, studentNumber: student.student_number, displayName: student.display_name });
  } catch (error) {
    console.error('Student login error:', error);
    return NextResponse.json({ error: 'Login error occurred.', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
