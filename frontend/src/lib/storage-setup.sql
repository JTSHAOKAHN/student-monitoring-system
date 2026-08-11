-- Create or verify the exam-pdfs storage bucket
-- This bucket should be PRIVATE for security

-- Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('exam-pdfs', 'exam-pdfs', false)
on conflict (id) do nothing;

-- Set up storage policies for the exam-pdfs bucket
-- Teachers can upload and read their own files
-- Service role can manage all files (for cleanup)

-- Allow authenticated users to upload
drop policy if exists "Authenticated users can upload to exam-pdfs" on storage.objects;
create policy "Authenticated users can upload to exam-pdfs" on storage.objects 
for insert 
with check (bucket_id = 'exam-pdfs' and auth.role() = 'authenticated');

-- Allow authenticated users to read files
drop policy if exists "Authenticated users can read exam-pdfs" on storage.objects;
create policy "Authenticated users can read exam-pdfs" on storage.objects 
for select 
using (bucket_id = 'exam-pdfs' and auth.role() = 'authenticated');

-- Allow service role to manage all files (for cleanup)
drop policy if exists "Service role can manage exam-pdfs" on storage.objects;
create policy "Service role can manage exam-pdfs" on storage.objects 
for all 
using (auth.role() = 'service_role') 
with check (auth.role() = 'service_role');