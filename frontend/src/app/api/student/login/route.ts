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

    // Try to find student by student_id first (format: STU-001, STU-002, etc.)
    const studentId = `STU-${String(sNum).padStart(3, '0')}`;
    
    let { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, user_id, student_id, display_name, passcode, users(full_name, email)')
      .eq('student_id', studentId)
      .maybeSingle();

    console.log('Student query result (by student_id):', { student, error: studentError });

    // If student_id doesn't work, try student_number column (if migration was run)
    if (!student && !studentError) {
      const { data: studentByNumber, error: numberError } = await supabase
        .from('students')
        .select('id, user_id, student_id, student_number, display_name, passcode, users(full_name, email)')
        .eq('student_number', sNum)
        .maybeSingle();

      console.log('Student query result (by student_number):', { student: studentByNumber, error: numberError });
      
      if (studentByNumber) {
        student = studentByNumber;
      }
    }

    // If student still doesn't exist, try to create them
    if (!student) {
      console.log('Student not found, creating new student account...');
      
      // First, check if user already exists with this email
      const studentEmail = `student${sNum}@school.internal`;
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', studentEmail)
        .maybeSingle();

      console.log('Existing user check:', { existingUser });

      let userId;
      
      if (existingUser) {
        userId = existingUser.id;
        console.log('Using existing user:', userId);
      } else {
        // Create new user
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            full_name: `Student ${sNum}`,
            email: studentEmail,
            role: 'student',
          })
          .select('id')
          .single();

        console.log('User creation result:', { newUser, error: userError });
        
        if (newUser) {
          userId = newUser.id;
        } else {
          console.error('Failed to create user:', userError);
          return NextResponse.json({ error: 'Failed to create user account.' }, { status: 500 });
        }
      }

      // Now create student record
      const { data: newStudent, error: newStudentError } = await supabase
        .from('students')
        .insert({
          user_id: userId,
          student_id: studentId,
          display_name: `Student ${sNum}`,
          passcode: 'student123',
          class_name: 'Classroom 1',
        })
        .select('id, user_id, student_id, display_name, passcode, users(full_name, email)')
        .single();

      console.log('Student creation result:', { newStudent, error: newStudentError });
      
      if (newStudent) {
        student = newStudent;
      } else {
        console.error('Failed to create student:', newStudentError);
        return NextResponse.json({ error: 'Failed to create student account.' }, { status: 500 });
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

    // Update presence (only if these columns exist)
    try {
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
      
      // If update fails due to missing columns, it's not critical
      if (updateError) {
        console.log('Student presence update failed (columns may not exist):', updateError);
      }
    } catch (updateError) {
      console.log('Student presence update failed (non-critical):', updateError);
    }

    // Set HTTP-only session cookie
    const cookieStore = await cookies();
    cookieStore.set(
      'student_session',
      JSON.stringify({
        studentId: student.id,
        userId: student.user_id,
        studentNumber: sNum,
        displayName: student.display_name || `Student ${sNum}`,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 hours
      }
    );

    console.log('Student login successful:', { studentNumber: sNum, displayName: student.display_name });
    return NextResponse.json({ ok: true, studentNumber: sNum, displayName: student.display_name });
  } catch (error) {
    console.error('Student login error:', error);
    return NextResponse.json({ error: 'Login error occurred.', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
