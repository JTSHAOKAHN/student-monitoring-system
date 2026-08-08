import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function POST() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('student_session');

  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value);
      
      // Update student presence in database
      const supabase = createSupabaseServiceClient();
      if (supabase && session.studentId) {
        await supabase
          .from('students')
          .update({
            is_logged_in: false,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', session.studentId);
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // Clear the session cookie
  cookieStore.delete('student_session');

  return NextResponse.json({ ok: true });
}
