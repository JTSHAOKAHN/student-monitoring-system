import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, description } = body;

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can create exams' }, { status: 403 });
  }

  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (teacherError || !teacher) {
    return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });
  }

  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert({
      title,
      description,
      teacher_id: teacher.id,
      published: false,
    })
    .select()
    .single();

  if (examError) {
    return NextResponse.json({ error: examError.message }, { status: 400 });
  }

  return NextResponse.json({ exam });
}
