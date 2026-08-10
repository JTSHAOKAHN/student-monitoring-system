-- Add missing columns to pdf_uploads table for the new PDF architecture

-- Add expires_at column for 24-hour expiration
ALTER TABLE public.pdf_uploads 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add processing_status column for tracking upload progress
ALTER TABLE public.pdf_uploads 
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';

-- Add extraction_status column for tracking text extraction progress
ALTER TABLE public.pdf_uploads 
ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'pending';

-- Add file_size column for storing file size in bytes
ALTER TABLE public.pdf_uploads 
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add mime_type column for storing file MIME type
ALTER TABLE public.pdf_uploads 
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Update existing records to have default values
UPDATE public.pdf_uploads 
SET 
  expires_at = uploaded_at + INTERVAL '24 hours',
  processing_status = 'ready',
  extraction_status = 'completed'
WHERE expires_at IS NULL;