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
  )
);

drop policy if exists "Students can view exam questions" on public.exam_questions;
create policy "Students can view exam questions" on public.exam_questions for select using (
  exists (select 1 from public.exams e where e.id = exam_questions.exam_id and e.published = true)
);
