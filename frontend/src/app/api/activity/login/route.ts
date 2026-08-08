import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { userId, role, email } = await request.json();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Get user info from users table
    const { data: user } = await serviceClient
      .from('users')
      .select('id, full_name, role')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log login event
    const { error: logError } = await serviceClient.from('monitoring_events').insert({
      user_id: user.id,
      event_type: 'login',
      details: { email, role, timestamp: new Date().toISOString() },
    });

    if (logError) {
      console.error('Failed to log login event:', logError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login logging error:', error);
    return NextResponse.json({ error: 'Failed to log login' }, { status: 500 });
  }
}