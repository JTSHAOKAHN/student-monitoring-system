import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('student_session');

  if (!sessionCookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const session = JSON.parse(sessionCookie.value);
    
    // Validate session structure
    if (!session.studentId || !session.studentNumber || !session.createdAt) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    // Check session expiration (2 hours)
    const sessionAge = Date.now() - session.createdAt;
    const MAX_SESSION_AGE = 2 * 60 * 60 * 1000; // 2 hours
    
    if (sessionAge > MAX_SESSION_AGE) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }
    
    // Verify student still exists in database
    const supabase = createSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }
    
    const { data: student } = await supabase
      .from('students')
      .select('id, student_id, users(full_name, email)')
      .eq('id', session.studentId)
      .maybeSingle();
    
    if (!student) {
      return NextResponse.json({ error: 'Student account not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      studentNumber: session.studentNumber,
      displayName: session.displayName,
      studentId: session.studentId,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}
