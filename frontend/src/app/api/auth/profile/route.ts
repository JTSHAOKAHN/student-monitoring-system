import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Profile API request body:', body);
    
    const { fullName, email, role } = body;
    
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('Environment check:', { 
      hasUrl: !!supabaseUrl, 
      hasAnonKey: !!supabaseAnonKey, 
      hasServiceKey: !!supabaseServiceKey 
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // Create client with anon key to get current user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: {
          getItem: (key) => {
            const cookie = cookieStore.get(key);
            return cookie?.value;
          },
          setItem: (key, value) => {
            cookieStore.set(key, value);
          },
          removeItem: (key) => {
            cookieStore.delete(key);
          },
        },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log('Auth user check:', { user, userError });

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use service role client to bypass RLS for profile creation
    const serviceClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

    if (!serviceClient) {
      return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
    }

    const profilePayload = {
      auth_user_id: user.id,
      full_name: fullName?.trim() || user.user_metadata?.full_name || user.email || 'User',
      role: role || 'teacher',
      email: email?.trim() || user.email || '',
    };

    console.log('Profile payload:', profilePayload);

    // Check if profile exists
    const { data: existingProfile, error: selectError } = await serviceClient
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    console.log('Existing profile check:', { existingProfile, selectError });

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 400 });
    }

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await serviceClient
        .from('users')
        .update(profilePayload)
        .eq('auth_user_id', user.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, profileId: existingProfile.id });
    }

    // Create new profile
    const { data: insertedProfile, error: insertError } = await serviceClient
      .from('users')
      .insert(profilePayload)
      .select('id')
      .single();

    console.log('Profile insert result:', { insertedProfile, insertError });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Create role-specific record
    if (role === 'teacher') {
      const { error: teacherError } = await serviceClient.from('teachers').insert({
        user_id: insertedProfile.id,
        department: 'General',
      });

      if (teacherError && teacherError.code !== '23505') {
        console.error('Teacher insert error:', teacherError);
      }
    } else if (role === 'student') {
      const { error: studentError } = await serviceClient.from('students').insert({
        user_id: insertedProfile.id,
        student_id: `STU-${user.id.slice(0, 6).toUpperCase()}`,
        class_name: 'General',
      });

      if (studentError && studentError.code !== '23505') {
        console.error('Student insert error:', studentError);
      }
    }

    return NextResponse.json({ success: true, profileId: insertedProfile.id });
  } catch (error) {
    console.error('Profile creation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create profile' }, { status: 500 });
  }
}