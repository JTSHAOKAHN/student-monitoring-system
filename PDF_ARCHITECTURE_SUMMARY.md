# PDF Storage + 24-Hour Expiration + Permanent Educational Data Architecture

## Technical Summary

### 1. Existing Tables Reused
- `pdf_uploads` - Extended with expiration and processing fields
- `ai_generated_questions` - Modified to remove cascade delete
- `questions` - Added question_bank_id reference
- `exams` - No changes required
- `attempts` - No changes required
- `student_responses` - No changes required
- `monitoring_events` - No changes required
- `analytics` - No changes required

### 2. New/Modified Tables

#### Extended `pdf_uploads` Table
```sql
-- Added fields:
- file_size: bigint
- mime_type: text (default 'application/pdf')
- expires_at: timestamptz (default now() + 24 hours)
- processing_status: text (uploaded/processing/extracting/extracted/generating_questions/ready/failed/expired)
- extraction_status: text (pending/in_progress/completed/failed)
```

#### New `extracted_content` Table
```sql
-- Permanent educational content independent of PDF lifecycle
- id: uuid (primary key)
- source_document_id: uuid (references pdf_uploads, on delete set null)
- content: text
- content_type: text (text/heading/table/image_caption/code)
- page_number: integer
- section_title: text
- created_at: timestamptz
```

#### New `question_bank` Table
```sql
-- Permanent question storage independent of PDF lifecycle
- id: uuid (primary key)
- created_by: uuid (references teachers, on delete set null)
- source_content_id: uuid (references extracted_content, on delete set null)
- source_document_id: uuid (references pdf_uploads, on delete set null)
- question_text: text
- question_type: text
- options: jsonb
- correct_answer: text
- difficulty: text
- explanation: text
- source_page_number: integer
- source_section: text
- created_at: timestamptz
- updated_at: timestamptz
```

#### New `exam_questions` Table
```sql
-- Link table between exams and question bank
- id: uuid (primary key)
- exam_id: uuid (references exams, on delete cascade)
- question_id: uuid (references question_bank, on delete cascade)
- question_order: integer
- points: integer
- created_at: timestamptz
```

#### Modified `questions` Table
```sql
-- Added reference to question bank
- question_bank_id: uuid (references question_bank, on delete set null)
```

### 3. Supabase Storage Changes
- Reused existing `pdfs` bucket (private)
- No bucket creation required
- Storage path format: `pdfs/{teacher_id}/{timestamp}-{sanitized_filename}.pdf`
- Existing storage policies maintained

### 4. RLS/Policy Changes
Added RLS policies for new tables:
- `extracted_content` - Teachers can view their extracted content
- `question_bank` - Teachers can view/insert/update their question bank
- `exam_questions` - Teachers can manage, students can view if exam published
- Enabled RLS on new tables: `extracted_content`, `question_bank`, `exam_questions`

### 5. Cleanup/Scheduled-Job Implementation
- **Primary Method**: API endpoint `/api/cleanup/pdfs` for external cron service
- **Alternative Method**: Supabase Edge Function at `supabase/functions/pdf-cleanup/index.ts`
- **Authentication**: Bearer token via `CRON_SECRET_KEY` environment variable
- **Schedule**: Recommended hourly execution
- **Safety Features**:
  - Checks processing status before deletion
  - Skips PDFs still being processed
  - Idempotent operations
  - Handles storage and database deletion separately
  - Logs all operations

### 6. PDF Processing Changes
- **File Size Limit**: Increased from 4MB to 50MB
- **File Type Validation**: PDF only (no images)
- **MIME Type Validation**: `application/pdf` only
- **Extension Validation**: `.pdf` extension required
- **Storage Path**: Teacher-specific organization
- **Processing Pipeline**:
  1. Upload to storage
  2. Create database record with expiration
  3. Extract text content permanently
  4. Store in `extracted_content` table
  5. Generate questions
  6. Store in `question_bank` table
  7. Store AI generated questions (legacy support)
  8. Update status to 'ready'

### 7. Permanent Educational Data Relationships
```
PDF (temporary, 24h)
  ↓
Extracted Content (permanent)
  ↓
Question Bank (permanent)
  ↓
Exam Questions (permanent)
  ↓
Exams (permanent)
  ↓
Student Attempts (permanent)
  ↓
Student Answers (permanent)
  ↓
Monitoring Events (permanent)
  ↓
Analytics (permanent)
```

All relationships use `on delete set null` to preserve educational data when source PDF is deleted.

### 8. Files/Components Modified

#### Database Schema
- `frontend/src/lib/schema.sql` - Extended and added new tables
- `frontend/src/lib/rls.sql` - Added RLS policies for new tables
- `frontend/src/lib/migration_fix_cascade.sql` - Migration for existing data

#### API Routes
- `frontend/src/app/api/pdf-exam/route.ts` - Enhanced with 50MB limit, validation, content extraction
- `frontend/src/app/api/cleanup/pdfs/route.ts` - New cleanup endpoint
- `frontend/src/app/api/pdfs/route.ts` - New PDF listing endpoint
- `frontend/src/app/api/pdf-extract/route.ts` - Standalone content extraction

#### Frontend Components
- `frontend/src/components/PdfExamComposer.tsx` - Added progress, 50MB limit, expiration display
- `frontend/src/components/PDFManagement.tsx` - New PDF management component
- `frontend/src/app/teacher/page.tsx` - Added PDF management section

#### Libraries
- `frontend/src/lib/gemini.ts` - Added text extraction functionality

#### Configuration
- `frontend/.env.local` - Added CRON_SECRET_KEY
- `frontend/SUPABASE_SETUP.md` - Updated with cleanup setup instructions

#### Edge Functions
- `supabase/functions/pdf-cleanup/index.ts` - Supabase Edge Function for cleanup

### 9. Tests Performed
- Schema validation and migration compatibility
- RLS policy syntax validation
- API endpoint error handling
- File upload validation logic
- Frontend component integration
- Environment variable configuration

### 10. Remaining Issues or Recommendations

#### Immediate Actions Required:
1. **Run Database Migrations**: Execute the SQL files in Supabase SQL Editor in order:
   - `schema.sql`
   - `rls.sql`
   - `migration_fix_cascade.sql` (if existing PDF uploads exist)

2. **Test PDF Upload**: Upload a PDF to verify the complete pipeline:
   - File validation (50MB limit, PDF only)
   - Storage upload
   - Database record creation
   - Content extraction
   - Question generation
   - Expiration tracking

3. **Setup Cleanup Job**: Configure external cron service or deploy Edge Function:
   - Set up hourly cron job calling `/api/cleanup/pdfs`
   - Configure `CRON_SECRET_KEY` in production
   - Test cleanup process manually

#### Development Considerations:
1. **Shortened Expiration for Testing**: Current implementation uses 24 hours. For faster testing, you could temporarily reduce the expiration period in the API endpoint.

2. **Manual Cleanup Testing**: Use the cleanup endpoint with proper authentication to test the deletion process before setting up automated scheduling.

3. **Monitoring**: Consider adding logging/metrics for cleanup operations to track success/failure rates.

#### Production Recommendations:
1. **Secret Management**: Ensure `CRON_SECRET_KEY` is set to a strong, unique value in production.

2. **Backup Strategy**: Implement backup strategy for permanent educational data before enabling automated cleanup.

3. **Monitoring Alerts**: Set up alerts for cleanup job failures to prevent storage bloat.

4. **Error Handling**: Consider adding retry logic for failed cleanup operations.

5. **Storage Limits**: Monitor Supabase storage usage to ensure cleanup is working as expected.

#### Architecture Benefits:
- **Clean Separation**: Temporary source data vs permanent educational data
- **Data Integrity**: Educational data preserved regardless of PDF lifecycle
- **Storage Efficiency**: Automatic cleanup of large PDF files
- **Traceability**: Questions retain source provenance even after PDF deletion
- **Scalability**: Architecture supports future enhancements (content reuse, analytics, etc.)

#### Security Considerations:
- RLS policies ensure teachers can only access their own data
- Students cannot access teacher documents or question banks
- Cleanup process uses service role for necessary permissions
- Storage remains private with signed URLs for access