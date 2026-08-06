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
  created_at timestamptz default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete cascade,
  prompt text not null check (length(prompt) between 3 and 2000),
  question_type text not null check (question_type in ('multiple_choice','essay','true_false','short_answer')),
  difficulty text default 'medium',
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
  submitted_at timestamptz
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
  focus_score numeric,
  cheating_risk numeric,
  completion_rate numeric,
  created_at timestamptz default now()
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
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.pdf_uploads (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  uploaded_at timestamptz default now()
);

create table if not exists public.ai_generated_questions (
  id uuid primary key default gen_random_uuid(),
  pdf_upload_id uuid references public.pdf_uploads(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  content jsonb,
  created_at timestamptz default now()
);
