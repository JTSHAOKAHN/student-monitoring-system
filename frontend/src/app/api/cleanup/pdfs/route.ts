import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint can be called by an external cron job service (like cron-job.org, EasyCron, etc.)
// It should be protected with a secret key in production

export async function POST(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET_KEY || 'dev-cron-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    console.log('Starting PDF cleanup process...');

    // Find expired PDFs
    const { data: expiredPDFs, error: fetchError } = await supabase
      .from('pdf_uploads')
      .select('id, storage_path, file_name, processing_status')
      .lte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching expired PDFs:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch expired PDFs' }, { status: 500 });
    }

    if (!expiredPDFs || expiredPDFs.length === 0) {
      console.log('No expired PDFs found');
      return NextResponse.json({ message: 'No expired PDFs to clean up', cleaned: 0 });
    }

    console.log(`Found ${expiredPDFs.length} expired PDFs to clean up`);

    let cleanedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const pdf of expiredPDFs) {
      try {
        // Check if PDF is still being processed
        if (pdf.processing_status === 'processing' || 
            pdf.processing_status === 'extracting' || 
            pdf.processing_status === 'generating_questions') {
          console.log(`Skipping PDF ${pdf.id} (${pdf.file_name}) - still processing`);
          skippedCount++;
          continue;
        }

        // Delete from Supabase Storage
        const { error: storageError } = await supabase.storage
          .from('pdfs')
          .remove([pdf.storage_path]);

        if (storageError) {
          console.error(`Failed to delete storage file for ${pdf.id}:`, storageError);
          errors.push({
            pdfId: pdf.id,
            fileName: pdf.file_name,
            error: storageError.message
          });
          // Continue with database deletion even if storage deletion fails
        }

        // Delete from database
        const { error: dbError } = await supabase
          .from('pdf_uploads')
          .delete()
          .eq('id', pdf.id);

        if (dbError) {
          console.error(`Failed to delete database record for ${pdf.id}:`, dbError);
          errors.push({
            pdfId: pdf.id,
            fileName: pdf.file_name,
            error: dbError.message
          });
        } else {
          cleanedCount++;
          console.log(`Successfully cleaned up PDF ${pdf.id} (${pdf.file_name})`);
        }
      } catch (error) {
        console.error(`Error processing PDF ${pdf.id}:`, error);
        errors.push({
          pdfId: pdf.id,
          fileName: pdf.file_name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const result = {
      message: 'PDF cleanup completed',
      totalFound: expiredPDFs.length,
      cleaned: cleanedCount,
      skipped: skippedCount,
      errors: errors.length,
      errorDetails: errors,
      timestamp: new Date().toISOString()
    };

    console.log('Cleanup result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('PDF cleanup error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}