create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  full_name text not null,
  role text not null default 'student' check (role in ('teacher','student','admin')),
  email text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  department text,
  created_at timestamptz default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  student_id text unique,
  class_name text,
  created_at timestamptz default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course_id uuid references public.courses(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 120),
  description text not null check (length(description) between 10 and 2000),
  teacher_id uuid references public.teachers(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  published boolean default false,
  duration_minutes integer default 60 check (duration_minutes between 5 and 480),
  published_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete cascade,
  question_bank_id uuid references public.question_bank(id) on delete set null,
  prompt text not null check (length(prompt) between 3 and 2000),
  question_type text not null check (question_type in ('multiple_choice','essay','true_false','short_answer','fill_blank')),
  options jsonb,
  correct_answer text,
  difficulty text default 'medium' check (difficulty in ('easy','medium','hard')),
  order_index integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade,
  content text,
  is_correct boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','abandoned')),
  score numeric check (score between 0 and 100),
  started_at timestamptz default now(),
  submitted_at timestamptz,
  unique (exam_id, student_id)
);

create table if not exists public.student_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.attempts(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  response text,
  is_correct boolean,
  answered_at timestamptz default now(),
  unique (attempt_id, question_id)
);

create table if not exists public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.attempts(id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  device text,
  browser text,
  ip_address text,
  location text
);

create table if not exists public.monitoring_events (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid references public.exam_sessions(id) on delete cascade,
  event_type text not null,
  details jsonb,
  created_at timestamptz default now()
);

create table if not exists public.analytics (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  attempt_id uuid references public.attempts(id) on delete cascade,
  focus_score numeric,
  cheating_risk numeric,
  completion_rate numeric,
  avg_time_seconds numeric,
  heatmap_data jsonb,
  event_summary jsonb,
  created_at timestamptz default now(),
  unique (attempt_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete cascade,
  generated_by uuid references public.teachers(id) on delete set null,
  summary text,
  generated_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'general' check (type in ('exam_started','exam_finished','student_flagged','report_generated','weekly_stats','exam_published','general')),
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.pdf_uploads (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  mime_type text default 'application/pdf',
  uploaded_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours'),
  processing_status text default 'uploaded' check (processing_status in ('uploaded','processing','extracting','extracted','generating_questions','ready','failed','expired')),
  extraction_status text default 'pending' check (extraction_status in ('pending','in_progress','completed','failed'))
);

-- Note: The ai_generated_questions table needs to be migrated to change cascade delete to set null
-- Run the migration_fix_cascade.sql script to safely update existing data
create table if not exists public.ai_generated_questions (
  id uuid primary key default gen_random_uuid(),
  pdf_upload_id uuid references public.pdf_uploads(id) on delete set null,
  exam_id uuid references public.exams(id) on delete cascade,
  content jsonb,
  created_at timestamptz default now()
);

-- Permanent extracted educational content (independent of PDF lifecycle)
create table if not exists public.extracted_content (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid references public.pdf_uploads(id) on delete set null,
  content text not null,
  content_type text default 'text' check (content_type in ('text','heading','table','image_caption','code')),
  page_number integer,
  section_title text,
  created_at timestamptz default now()
);

-- Permanent question bank (independent of PDF lifecycle)
create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.teachers(id) on delete set null,
  source_content_id uuid references public.extracted_content(id) on delete set null,
  source_document_id uuid references public.pdf_uploads(id) on delete set null,
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice','essay','true_false','short_answer','fill_blank')),
  options jsonb,
  correct_answer text,
  difficulty text default 'medium' check (difficulty in ('easy','medium','hard')),
  explanation text,
  source_page_number integer,
  source_section text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Link questions to exams (reusing existing questions table structure)
create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete cascade,
  question_id uuid references public.question_bank(id) on delete cascade,
  question_order integer default 0,
  points integer default 1,
  created_at timestamptz default now()
);

create index if not exists idx_exams_published on public.exams(published);
create index if not exists idx_attempts_exam on public.attempts(exam_id);
create index if not exists idx_monitoring_session on public.monitoring_events(exam_session_id);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read);
create index if not exists idx_analytics_exam on public.analytics(exam_id);

-- New indexes for PDF and content management
create index if not exists idx_pdf_uploads_expires on public.pdf_uploads(expires_at);
create index if not exists idx_pdf_uploads_teacher on public.pdf_uploads(teacher_id);
create index if not exists idx_pdf_uploads_status on public.pdf_uploads(processing_status);
create index if not exists idx_extracted_content_source on public.extracted_content(source_document_id);
create index if not exists idx_question_bank_source on public.question_bank(source_document_id);
create index if not exists idx_question_bank_content on public.question_bank(source_content_id);
create index if not exists idx_exam_questions_exam on public.exam_questions(exam_id);

-- Migration helpers for existing databases
alter table public.exams add column if not exists duration_minutes integer default 60;
alter table public.exams add column if not exists published_at timestamptz;
alter table public.questions add column if not exists options jsonb;
alter table public.questions add column if not exists correct_answer text;
alter table public.questions add column if not exists order_index integer default 0;
alter table public.questions add column if not exists question_bank_id uuid references public.question_bank(id) on delete set null;
alter table public.notifications add column if not exists type text default 'general';
alter table public.notifications add column if not exists link text;
alter table public.analytics add column if not exists attempt_id uuid references public.attempts(id) on delete cascade;
alter table public.analytics add column if not exists avg_time_seconds numeric;
alter table public.analytics add column if not exists heatmap_data jsonb;
alter table public.analytics add column if not exists event_summary jsonb;

alter table public.students add column if not exists student_number integer unique check (student_number between 1 and 35);
alter table public.students add column if not exists display_name text;
alter table public.students add column if not exists passcode text default 'student123';
alter table public.students add column if not exists is_logged_in boolean default false;
alter table public.students add column if not exists last_activity_at timestamptz;
alter table public.students add column if not exists last_login_at timestamptz;
alter table public.students add column if not exists current_session_id uuid;

-- PDF uploads migration
alter table public.pdf_uploads add column if not exists file_size bigint;
alter table public.pdf_uploads add column if not exists mime_type text default 'application/pdf';
alter table public.pdf_uploads add column if not exists expires_at timestamptz default (now() + interval '24 hours');
alter table public.pdf_uploads add column if not exists processing_status text default 'uploaded' check (processing_status in ('uploaded','processing','extracting','extracted','generating_questions','ready','failed','expired'));
alter table public.pdf_uploads add column if not exists extraction_status text default 'pending' check (extraction_status in ('pending','in_progress','completed','failed'));

-- Remove cascade delete from ai_generated_questions
-- This requires recreating the table, so we'll do it in a separate migration

-- Seed 35 student records cleanly if missing
do $$
declare
  i integer;
  u_id uuid;
begin
  for i in 1..35 loop
    if not exists (select 1 from public.students where student_number = i) then
      insert into public.users (full_name, email, role)
      values ('Student ' || i, 'student' || i || '@school.internal', 'student')
      returning id into u_id;

      insert into public.students (user_id, student_id, student_number, display_name, passcode, class_name)
      values (u_id, 'STU-' || lpad(i::text, 3, '0'), i, 'Student ' || i, 'student123', 'Classroom 1');
    end if;
  end loop;
end $$;

-- Supabase storage bucket (run in Supabase dashboard or via API):
-- insert into storage.buckets (id, name, public) values ('pdfs', 'pdfs', false);

