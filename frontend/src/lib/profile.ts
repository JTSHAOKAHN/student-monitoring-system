import type { SupabaseClient } from '@supabase/supabase-js';

type Role = 'teacher' | 'student' | 'admin';

function normalizeRole(role: Role) {
  return role === 'admin' ? 'admin' : role;
}

export async function ensureUserProfile(
  supabase: SupabaseClient | null,
  role: Role,
  fullName?: string,
  email?: string
) {
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const normalizedRole = normalizeRole(role);
  const profilePayload = {
    auth_user_id: user.id,
    full_name: fullName?.trim() || (user.user_metadata?.full_name as string | undefined) || user.email || 'User',
    role: normalizedRole,
    email: email?.trim() || user.email || '',
  };

  const { data: existingProfile, error: selectError } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingProfile) {
    const { error: updateError } = await supabase
      .from('users')
      .update(profilePayload)
      .eq('auth_user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return existingProfile.id;
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from('users')
    .insert(profilePayload)
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  if (normalizedRole === 'teacher') {
    const { error: teacherError } = await supabase.from('teachers').insert({
      user_id: insertedProfile.id,
      department: 'General',
    });

    if (teacherError && teacherError.code !== '23505') {
      throw teacherError;
    }
  } else if (normalizedRole === 'student') {
    const { error: studentError } = await supabase.from('students').insert({
      user_id: insertedProfile.id,
      student_id: `STU-${user.id.slice(0, 6).toUpperCase()}`,
      class_name: 'General',
    });

    if (studentError && studentError.code !== '23505') {
      throw studentError;
    }
  }

  return insertedProfile.id;
}
