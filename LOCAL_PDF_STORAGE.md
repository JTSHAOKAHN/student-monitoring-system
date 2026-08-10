# Local PDF Storage Implementation

## What Changed

Switched from Supabase Storage to local file storage for PDF uploads to avoid storage bucket issues during localhost development.

## Implementation Details

### Storage Location
- **Directory:** `frontend/uploads/`
- **File naming:** `teacher-{timestamp}-{sanitized-filename}.pdf`
- **Auto-created:** Directory is created automatically if it doesn't exist

### PDF Upload Process
1. **File saved locally** to `uploads/` directory
2. **Metadata stored** in Supabase database (`pdf_uploads` table)
3. **Text extraction** using Gemini AI
4. **Question generation** stored in database
5. **24-hour expiration** via cleanup endpoint

### Cleanup System
- **Endpoint:** `/api/cleanup/pdfs`
- **Function:** Deletes expired PDFs from local storage and database
- **Schedule:** Can be called manually or via cron job

## Files Modified

1. **`frontend/src/app/api/pdf-exam/route.ts`**
   - Switched from Supabase Storage to local file system
   - Uses Node.js `fs/promises` for file operations
   - Same functionality, different storage backend

2. **`frontend/src/app/api/cleanup/pdfs/route.ts`**
   - Updated to delete local files instead of Supabase Storage
   - Maintains database cleanup functionality

3. **`frontend/.gitignore`**
   - Added `/uploads/` to prevent committing PDF files
   - Added `*.pdf` to prevent accidental PDF commits

## Benefits

✅ **No Supabase Storage dependency** for PDF files
✅ **Works immediately** without storage bucket configuration
✅ **Faster uploads** for local development
✅ **Same database schema** and functionality
✅ **Easy to test** and debug

## Testing Instructions

### 1. Test PDF Upload
1. Go to http://localhost:3000/teacher
2. Upload a PDF file (up to 50MB)
3. Check if the file appears in `frontend/uploads/` directory
4. Verify database records are created

### 2. Test PDF Processing
1. After upload, check if questions are generated
2. Verify extracted content is stored in database
3. Check question bank has the generated questions

### 3. Test Cleanup
1. Upload a PDF
2. Manually change its `expires_at` in database to a past date
3. Call cleanup endpoint: `POST http://localhost:3000/api/cleanup/pdfs`
4. Verify local file is deleted
5. Verify database record is removed

## Migration Notes

### For Production Deployment
When ready to deploy to production, you can:

1. **Keep local storage** if using a file server
2. **Switch back to Supabase Storage** by reverting the PDF route changes
3. **Use cloud storage** (AWS S3, Cloudinary, etc.) by updating the upload logic

### Database Schema
No changes needed - the `pdf_uploads` table works with both local and cloud storage:
- `storage_path` field works with both local paths and storage URLs
- All other fields remain the same

## Troubleshooting

### File Not Saved
- Check if `uploads/` directory exists
- Verify write permissions on the directory
- Check server logs for file system errors

### Cleanup Not Working
- Verify cleanup endpoint is called
- Check if `expires_at` dates are in the past
- Ensure files exist in the `uploads/` directory

### Database Issues
- Same as before - check Supabase connection
- Verify RLS policies are correctly set
- Check that teachers table has records

## Security Notes

- **Local storage is only for development**
- **Production should use secure cloud storage**
- **Files are deleted after 24 hours** automatically
- **Database RLS still applies** to all metadata

## Next Steps

1. ✅ Test PDF upload with local storage
2. ✅ Verify question generation works
3. ✅ Test cleanup functionality
4. ✅ Monitor `uploads/` directory size
5. 🔄 Decide on production storage solution