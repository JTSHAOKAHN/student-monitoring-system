import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getAdminOverview() {
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

  const [usersResult, teachersResult, studentsResult, examsResult] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('teachers').select('id', { count: 'exact', head: true }),
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('exams').select('id', { count: 'exact', head: true }),
  ]);

  return {
    overview: {
      users: usersResult.count ?? 0,
      teachers: teachersResult.count ?? 0,
      students: studentsResult.count ?? 0,
      exams: examsResult.count ?? 0,
    },
    activity: [
      {
        title: 'Admin dashboard ready',
        detail: 'The oversight dashboard is now connected to the database layer.',
      },
      {
        title: 'Teacher exam creation',
        detail: 'Teacher-created exams are now stored and available for oversight.',
      },
    ],
  };
}
