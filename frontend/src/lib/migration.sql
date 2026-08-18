-- Production Database Migration Script (fixed by Supabase AI Agent)
-- Run this in your Supabase SQL editor to fix missing columns and tables

-- IMPORTANT: Run this in order to avoid foreign key errors

BEGIN;

-- Ensure gen_random_uuid() is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Create question_bank table FIRST
CREATE TABLE IF NOT EXISTS public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid,
  source_content_id uuid,
  prompt text NOT NULL,
  question_type text NOT NULL,
  options jsonb,
  correct_answer text,
  difficulty text DEFAULT 'medium',
  topic_tags text[],
  created_at timestamptz DEFAULT now()
);

-- Step 2: Ensure questions table exists (with all required columns)
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice','true_false','short_answer','fill_blank')),
  options jsonb,
  correct_answer text,
  difficulty text DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  order_index integer DEFAULT 0,
  question_bank_id uuid REFERENCES public.question_bank(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Add missing columns to questions table (safe if columns already exist)
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS options jsonb,
  ADD COLUMN IF NOT EXISTS correct_answer text,
  ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS question_bank_id uuid REFERENCES public.question_bank(id) ON DELETE SET NULL;

-- Step 4: Add missing columns to exams table
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 60;

-- Step 5: Add missing columns to notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS link text;

-- Step 6: Add missing columns to pdf_uploads table
ALTER TABLE public.pdf_uploads
  ADD COLUMN IF NOT EXISTS mime_type text DEFAULT 'application/pdf',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'uploaded'
    CHECK (processing_status IN ('uploaded','processing','extracting','extracted','generating_questions','ready','failed','expired')),
  ADD COLUMN IF NOT EXISTS extraction_status text DEFAULT 'pending'
    CHECK (extraction_status IN ('pending','in_progress','completed','failed'));

-- Step 7: Add indexes for performance (FIXED: use public.questions, not public.exam_questions)
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON public.questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON public.questions(question_type);
CREATE INDEX IF NOT EXISTS idx_question_bank_source ON public.question_bank(source_document_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id_2 ON public.questions(exam_id);

-- Step 8: Enable RLS on questions table
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policy for questions (Teachers)
DROP POLICY IF EXISTS "Teachers can manage their exam questions" ON public.questions;
CREATE POLICY "Teachers can manage their exam questions" ON public.questions
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.exams e
    JOIN public.teachers t ON t.id = e.teacher_id
    JOIN public.users u ON u.id = t.user_id
    WHERE e.id = questions.exam_id
      AND u.auth_user_id = auth.uid()
  )
);

-- Step 10: Students can read questions for their exams
DROP POLICY IF EXISTS "Students can read exam questions" ON public.questions;
CREATE POLICY "Students can read exam questions" ON public.questions
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.exams e
    WHERE e.id = questions.exam_id
      AND e.published = true
  )
);

-- Step 11: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.questions TO anon, authenticated;
GRANT ALL ON TABLE public.question_bank TO anon, authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
END $$;