-- Temporarily disable RLS for users table to allow signup
-- alter table public.users enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.courses enable row level security;
alter table public.classes enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.attempts enable row level security;
alter table public.student_responses enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.monitoring_events enable row level security;
alter table public.analytics enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.pdf_uploads enable row level security;
alter table public.ai_generated_questions enable row level security;
alter table public.extracted_content enable row level security;
alter table public.question_bank enable row level security;
alter table public.exam_questions enable row level security;

-- Users
drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile" on public.users for select using (auth.uid() = auth_user_id);

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile" on public.users for update using (auth.uid() = auth_user_id);

drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile" on public.users for insert with check (auth.uid() = auth_user_id);

-- Allow authenticated users to insert their own profile during signup
drop policy if exists "Users can insert profile on signup" on public.users;
create policy "Users can insert profile on signup" on public.users for insert with check (auth.uid() = auth_user_id);

-- Teachers
drop policy if exists "Teachers can view their own teacher row" on public.teachers;
create policy "Teachers can view their own teacher row" on public.teachers for select using (
  exists (select 1 from public.users u where u.id = teachers.user_id and u.auth_user_id = auth.uid())
);

drop policy if exists "Teachers can insert their own row" on public.teachers;
create policy "Teachers can insert their own row" on public.teachers for insert with check (
  exists (select 1 from public.users u where u.id = teachers.user_id and u.auth_user_id = auth.uid())
);

-- Students
drop policy if exists "Students can view their own student row" on public.students;
create policy "Students can view their own student row" on public.students for select using (
  exists (select 1 from public.users u where u.id = students.user_id and u.auth_user_id = auth.uid())
);

drop policy if exists "Students can insert their own row" on public.students;
create policy "Students can insert their own row" on public.students for insert with check (
  exists (select 1 from public.users u where u.id = students.user_id and u.auth_user_id = auth.uid())
);

-- Exams
drop policy if exists "Teachers can insert exams" on public.exams;
create policy "Teachers can insert exams" on public.exams for insert with check (
  exists (select 1 from public.teachers t join public.users u on u.id = t.user_id where t.id = exams.teacher_id and u.auth_user_id = auth.uid())
);

drop policy if exists "Teachers can view their own exams" on public.exams;
create policy "Teachers can view their own exams" on public.exams for select using (
  exists (select 1 from public.teachers t join public.users u on u.id = t.user_id where t.id = exams.teacher_id and u.auth_user_id = auth.uid())
  or published = true
);

drop policy if exists "Teachers can update their own exams" on public.exams;
create policy "Teachers can update their own exams" on public.exams for update using (
  exists (select 1 from public.teachers t join public.users u on u.id = t.user_id where t.id = exams.teacher_id and u.auth_user_id = auth.uid())
);

drop policy if exists "Students can view published exams" on public.exams;
create policy "Students can view published exams" on public.exams for select using (published = true);

-- Questions
drop policy if exists "Teachers can manage their exam questions" on public.questions;
create policy "Teachers can manage their exam questions" on public.questions for all using (
  exists (
    select 1 from public.exams e join public.teachers t on t.id = e.teacher_id
    join public.users u on u.id = t.user_id
    where e.id = questions.exam_id and u.auth_user_id = auth.uid()
  )
);

drop policy if exists "Students can view published exam questions" on public.questions;
create policy "Students can view published exam questions" on public.questions for select using (
  exists (select 1 from public.exams e where e.id = questions.exam_id and e.published = true)
);

-- Attempts
drop policy if exists "Students can view their own attempts" on public.attempts;
create policy "Students can view their own attempts" on public.attempts for select using (
  exists (select 1 from public.students s join public.users u on u.id = s.user_id where s.id = attempts.student_id and u.auth_user_id = auth.uid())
);

drop policy if exists "Students can insert their own attempts" on public.attempts;
create policy "Students can insert their own attempts" on public.attempts for insert with check (
  exists (select 1 from public.students s join public.users u on u.id = s.user_id where s.id = attempts.student_id and u.auth_user_id = auth.uid())
);

drop policy if exists "Students can update their own attempts" on public.attempts;
create policy "Students can update their own attempts" on public.attempts for update using (
  exists (select 1 from public.students s join public.users u on u.id = s.user_id where s.id = attempts.student_id and u.auth_user_id = auth.uid())
);

drop policy if exists "Teachers can view attempts for their exams" on public.attempts;
create policy "Teachers can view attempts for their exams" on public.attempts for select using (
  exists (
    select 1 from public.exams e join public.teachers t on t.id = e.teacher_id
    join public.users u on u.id = t.user_id
    where e.id = attempts.exam_id and u.auth_user_id = auth.uid()
  )
);

-- Student responses
drop policy if exists "Students manage their responses" on public.student_responses;
create policy "Students manage their responses" on public.student_responses for all using (
  exists (
    select 1 from public.attempts a join public.students s on s.id = a.student_id
    join public.users u on u.id = s.user_id
    where a.id = student_responses.attempt_id and u.auth_user_id = auth.uid()
  )
);

drop policy if exists "Teachers view responses for their exams" on public.student_responses;
create policy "Teachers view responses for their exams" on public.student_responses for select using (
  exists (
    select 1 from public.attempts a join public.exams e on e.id = a.exam_id
    join public.teachers t on t.id = e.teacher_id join public.users u on u.id = t.user_id
    where a.id = student_responses.attempt_id and u.auth_user_id = auth.uid()
  )
);

-- Exam sessions
drop policy if exists "Students manage their sessions" on public.exam_sessions;
create policy "Students manage their sessions" on public.exam_sessions for all using (
  exists (
    select 1 from public.attempts a join public.students s on s.id = a.student_id
    join public.users u on u.id = s.user_id
    where a.id = exam_sessions.attempt_id and u.auth_user_id = auth.uid()
  )
);

drop policy if exists "Teachers view sessions for their exams" on public.exam_sessions;
create policy "Teachers view sessions for their exams" on public.exam_sessions for select using (
  exists (
    select 1 from public.attempts a join public.exams e on e.id = a.exam_id
    join public.teachers t on t.id = e.teacher_id join public.users u on u.id = t.user_id
    where a.id = exam_sessions.attempt_id and u.auth_user_id = auth.uid()
  )
);

-- Monitoring events
drop policy if exists "Students insert monitoring events" on public.monitoring_events;
create policy "Students insert monitoring events" on public.monitoring_events for insert with check (
  exists (
    select 1 from public.exam_sessions es join public.attempts a on a.id = es.attempt_id
    join public.students s on s.id = a.student_id join public.users u on u.id = s.user_id
    where es.id = monitoring_events.exam_session_id and u.auth_user_id = auth.uid()
  )
);

drop policy if exists "Students view their monitoring events" on public.monitoring_events;
create policy "Students view their monitoring events" on public.monitoring_events for select using (
  exists (
    select 1 from public.exam_sessions es join public.attempts a on a.id = es.attempt_id
    join public.students s on s.id = a.student_id join public.users u on u.id = s.user_id
    where es.id = monitoring_events.exam_session_id and u.auth_user_id = auth.uid()
  )
);

drop policy if exists "Teachers view monitoring events" on public.monitoring_events;
create policy "Teachers view monitoring events" on public.monitoring_events for select using (
  exists (
    select 1 from public.exam_sessions es join public.attempts a on a.id = es.attempt_id
    join public.exams e on e.id = a.exam_id join public.teachers t on t.id = e.teacher_id
    join public.users u on u.id = t.user_id
    where es.id = monitoring_events.exam_session_id and u.auth_user_id = auth.uid()
  )
);

-- Analytics
drop policy if exists "Teachers view analytics for their exams" on public.analytics;
create policy "Teachers view analytics for their exams" on public.analytics for select using (
  exists (
    select 1 from public.exams e join public.teachers t on t.id = e.teacher_id
    join public.users u on u.id = t.user_id
    where e.id = analytics.exam_id and u.auth_user_id = auth.uid()
  )
);

drop policy if exists "Students view their analytics" on public.analytics;
create policy "Students view their analytics" on public.analytics for select using (
  exists (select 1 from public.students s join public.users u on u.id = s.user_id where s.id = analytics.student_id and u.auth_user_id = auth.uid())
);

-- Notifications
drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications" on public.notifications for select using (
  exists (select 1 from public.users u where u.id = notifications.user_id and u.auth_user_id = auth.uid())
);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications" on public.notifications for update using (
  exists (select 1 from public.users u where u.id = notifications.user_id and u.auth_user_id = auth.uid())
);

-- PDF uploads
drop policy if exists "Teachers manage their PDF uploads" on public.pdf_uploads;
create policy "Teachers manage their PDF uploads" on public.pdf_uploads for all using (
  exists (select 1 from public.teachers t join public.users u on u.id = t.user_id where t.id = pdf_uploads.teacher_id and u.auth_user_id = auth.uid())
);

-- AI generated questions
drop policy if exists "Teachers manage AI questions" on public.ai_generated_questions;
create policy "Teachers manage AI questions" on public.ai_generated_questions for all using (
  exists (
    select 1 from public.pdf_uploads p join public.teachers t on t.id = p.teacher_id
    join public.users u on u.id = t.user_id
    where p.id = ai_generated_questions.pdf_upload_id and u.auth_user_id = auth.uid()
  )
);
-- Extracted content (permanent educational data)
drop policy if exists "Teachers can view extracted content" on public.extracted_content;
create policy "Teachers can view extracted content" on public.extracted_content for select using (
  exists (select 1 from public.pdf_uploads p join public.teachers t join public.users u on u.id = t.user_id where p.id = extracted_content.source_document_id and u.auth_user_id = auth.uid())
);

-- Question bank (permanent educational data)
drop policy if exists "Teachers can view their question bank" on public.question_bank;
create policy "Teachers can view their question bank" on public.question_bank for select using (
  exists (select 1 from public.teachers t join public.users u on u.id = t.user_id where t.id = question_bank.created_by and u.auth_user_id = auth.uid())
);

drop policy if exists "Teachers can insert to question bank" on public.question_bank;
create policy "Teachers can insert to question bank" on public.question_bank for insert with check (
  exists (select 1 from public.teachers t join public.users u on u.id = t.user_id where t.id = question_bank.created_by and u.auth_user_id = auth.uid())
);

drop policy if exists "Teachers can update their question bank" on public.question_bank;
create policy "Teachers can update their question bank" on public.question_bank for update using (
  exists (select 1 from public.teachers t join public.users u on u.id = t.user_id where t.id = question_bank.created_by and u.auth_user_id = auth.uid())
);

-- Exam questions (link between exams and question bank)
drop policy if exists "Teachers can manage exam questions" on public.exam_questions;
create policy "Teachers can manage exam questions" on public.exam_questions for all using (
  exists (
    select 1 from public.exams e join public.teachers t on t.id = e.teacher_id
    join public.users u on u.id = t.user_id
    where e.id = exam_questions.exam_id and u.auth_user_id = auth.uid())
);

drop policy if exists "Students can view exam questions" on public.exam_questions;
create policy "Students can view exam questions" on public.exam_questions for select using (
  exists (select 1 from public.exams e where e.id = exam_questions.exam_id and e.published = true)
);
