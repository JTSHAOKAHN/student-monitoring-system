import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limiter';

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  try {
    // Rate limiting based on IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(`student_login_${ip}`, MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_MS);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: 'Too many failed attempts. Please try again later.',
        retryAfter: rateLimitResult.retryAfter
      }, { status: 429 });
    }

    const { studentNumber, passcode } = await request.json();
    const sNum = Number(studentNumber);

    if (!sNum || sNum < 1 || sNum > 35) {
      return NextResponse.json({ error: 'Invalid student number. Must be between 1 and 35.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service client unavailable.' }, { status: 500 });
    }

    // Try to find student by student_id first (format: STU-001, STU-002, etc.)
    const studentId = `STU-${String(sNum).padStart(3, '0')}`;
    
    let { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, user_id, student_id, users(full_name, email)')
      .eq('student_id', studentId)
      .maybeSingle();

    // If student_id doesn't work, try student_number column (if migration was run)
    if (!student && !studentError) {
      const { data: studentByNumber, error: numberError } = await supabase
        .from('students')
        .select('id, user_id, student_id, student_number, users(full_name, email)')
        .eq('student_number', sNum)
        .maybeSingle();
      
      if (studentByNumber) {
        student = studentByNumber;
      }
    }

    // If student still doesn't exist, return error (no auto-creation for production)
    if (!student) {
      return NextResponse.json({ error: 'Student account not found. Please contact your teacher.' }, { status: 404 });
    }

    if (!student) {
      console.error('Unable to initialize student account');
      return NextResponse.json({ error: 'Unable to initialize student account.' }, { status: 500 });
    }

    // Validate passcode if the column exists in database
    const studentData = student as any;
    if (studentData.passcode && studentData.passcode !== passcode) {
      return NextResponse.json({ error: 'Invalid passcode.' }, { status: 401 });
    }
    
    // Set HTTP-only session cookie with reduced time for security
    const cookieStore = await cookies();
    const displayName = studentData.users?.full_name || `Student ${sNum}`;
    
    cookieStore.set(
      'student_session',
      JSON.stringify({
        studentId: student.id,
        userId: student.user_id,
        studentNumber: sNum,
        displayName: displayName,
        createdAt: Date.now(),
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 2, // 2 hours (reduced from 8 hours for security)
      }
    );

    return NextResponse.json({ ok: true, studentNumber: sNum, displayName });
  } catch (error) {
    return NextResponse.json({ error: 'Login error occurred.', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
