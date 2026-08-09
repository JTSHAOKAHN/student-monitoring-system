import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { supabase, user, profile, teacher, student } = await getAuthenticatedProfile();

    return NextResponse.json({
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      } : null,
      profile: profile,
      teacher: teacher,
      student: student,
      message: user ? "User is authenticated" : "No user found"
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}