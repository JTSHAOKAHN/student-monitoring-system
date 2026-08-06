import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateExamPayload } from '@/lib/validation';

export async function POST(request: Request) {
  try {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const validation = validateExamPayload(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { title, description } = validation.data;

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
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 });
  }
}
