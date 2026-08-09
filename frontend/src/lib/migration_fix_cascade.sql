-- Migration to fix cascade delete in ai_generated_questions
-- This preserves existing data while changing the constraint

-- Step 1: Create a backup of existing data
create table if not exists public.ai_generated_questions_backup as
select * from public.ai_generated_questions;

-- Step 2: Drop the existing table
drop table if exists public.ai_generated_questions;

-- Step 3: Recreate with the correct constraint (set null instead of cascade)
create table public.ai_generated_questions (
  id uuid primary key default gen_random_uuid(),
  pdf_upload_id uuid references public.pdf_uploads(id) on delete set null,
  exam_id uuid references public.exams(id) on delete cascade,
  content jsonb,
  created_at timestamptz default now()
);

-- Step 4: Restore data from backup
insert into public.ai_generated_questions
select * from public.ai_generated_questions_backup;

-- Step 5: Drop backup table
drop table if exists public.ai_generated_questions_backup;