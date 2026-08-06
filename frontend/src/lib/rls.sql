alter table public.users enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.courses enable row level security;
alter table public.classes enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.attempts enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.monitoring_events enable row level security;
alter table public.analytics enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.pdf_uploads enable row level security;
alter table public.ai_generated_questions enable row level security;

drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
  on public.users
  for select
  using (auth.uid() = auth_user_id);

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users
  for update
  using (auth.uid() = auth_user_id);

drop policy if exists "Teachers can view their own teacher row" on public.teachers;
create policy "Teachers can view their own teacher row"
  on public.teachers
  for select
  using (
    exists (
      select 1 from public.users u
      where u.id = teachers.user_id and u.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Students can view their own student row" on public.students;
create policy "Students can view their own student row"
  on public.students
  for select
  using (
    exists (
      select 1 from public.users u
      where u.id = students.user_id and u.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Teachers can insert exams" on public.exams;
create policy "Teachers can insert exams"
  on public.exams
  for insert
  with check (
    exists (
      select 1 from public.teachers t
      join public.users u on u.id = t.user_id
      where t.id = exams.teacher_id and u.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Teachers can view their own exams" on public.exams;
create policy "Teachers can view their own exams"
  on public.exams
  for select
  using (
    exists (
      select 1 from public.teachers t
      join public.users u on u.id = t.user_id
      where t.id = exams.teacher_id and u.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Teachers can update their own exams" on public.exams;
create policy "Teachers can update their own exams"
  on public.exams
  for update
  using (
    exists (
      select 1 from public.teachers t
      join public.users u on u.id = t.user_id
      where t.id = exams.teacher_id and u.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications
  for select
  using (
    exists (
      select 1 from public.users u
      where u.id = notifications.user_id and u.auth_user_id = auth.uid()
    )
  );
