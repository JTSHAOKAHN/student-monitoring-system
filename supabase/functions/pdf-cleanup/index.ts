// Supabase Edge Function for PDF Cleanup
// Deploy this to Supabase Edge Functions with a cron job trigger
// This function automatically deletes expired PDFs (24 hours after upload)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify this is a cron job or authorized request
    const authHeader = req.headers.get('authorization');
    const cronKey = Deno.env.get('CRON_SECRET_KEY');
    
    if (authHeader !== `Bearer ${cronKey}`) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting PDF cleanup process...');

    // Find expired PDFs
    const { data: expiredPDFs, error: fetchError } = await supabase
      .from('pdf_uploads')
      .select('id, storage_path, file_name, processing_status')
      .lte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching expired PDFs:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired PDFs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expiredPDFs || expiredPDFs.length === 0) {
      console.log('No expired PDFs found');
      return new Response(
        JSON.stringify({ message: 'No expired PDFs to clean up', cleaned: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiredPDFs.length} expired PDFs to clean up`);

    let cleanedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const pdf of expiredPDFs) {
      try {
        // Check if PDF is still being processed
        if (pdf.processing_status === 'processing' || pdf.processing_status === 'extracting' || pdf.processing_status === 'generating_questions') {
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
          error: error.message
        });
      }
    }

    const result = {
      message: 'PDF cleanup completed',
      totalFound: expiredPDFs.length,
      cleaned: cleanedCount,
      skipped: skippedCount,
      errors: errors.length,
      errorDetails: errors
    };

    console.log('Cleanup result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PDF cleanup error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});