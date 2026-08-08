import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Create test teacher profile
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('email', 'teacher@test.com')
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test teacher account already exists',
        email: 'teacher@test.com',
        password: 'Any password will work for testing'
      });
    }

    // Create user profile
    const { data: user, error: userError } = await serviceClient
      .from('users')
      .insert({
        full_name: 'Test Teacher',
        email: 'teacher@test.com',
        role: 'teacher',
        auth_user_id: 'test-teacher-id',
      })
      .select('id')
      .single();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    // Create teacher record
    const { error: teacherError } = await serviceClient.from('teachers').insert({
      user_id: user.id,
      department: 'Testing',
    });

    if (teacherError) {
      return NextResponse.json({ error: teacherError.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test teacher account created successfully',
      email: 'teacher@test.com',
      password: 'Any password will work for testing'
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Failed to setup test teacher' }, { status: 500 });
  }
}