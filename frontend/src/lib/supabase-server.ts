import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );
}

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getAuthenticatedProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, user: null, profile: null, teacher: null, student: null };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, full_name, email')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) {
    return { supabase, user, profile: null, teacher: null, student: null };
  }

  let teacher = null;
  let student = null;

  if (profile.role === 'teacher') {
    const { data } = await supabase.from('teachers').select('id').eq('user_id', profile.id).maybeSingle();
    teacher = data;
  }

  if (profile.role === 'student') {
    const { data } = await supabase.from('students').select('id').eq('user_id', profile.id).maybeSingle();
    student = data;
  }

  return { supabase, user, profile, teacher, student };
}
