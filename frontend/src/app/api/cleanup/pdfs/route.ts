import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Find expired PDF uploads
    const now = new Date().toISOString();
    
    const { data: expiredPDFs, error: fetchError } = await supabase
      .from('pdf_uploads')
      .select('id, storage_path, file_name')
      .lt('expires_at', now);

    if (fetchError) {
      console.error('Error fetching expired PDFs:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch expired PDFs' }, { status: 500 });
    }

    if (!expiredPDFs || expiredPDFs.length === 0) {
      return NextResponse.json({ 
        message: 'No expired PDFs to clean up',
        cleaned: 0
      });
    }

    let cleanedCount = 0;
    const errors: string[] = [];

    for (const pdf of expiredPDFs) {
      try {
        // Delete local file
        const filePath = path.join(process.cwd(), 'uploads', pdf.storage_path);
        
        if (existsSync(filePath)) {
          await unlink(filePath);
          console.log(`Deleted local file: ${filePath}`);
        }

        // Delete database record
        const { error: deleteError } = await supabase
          .from('pdf_uploads')
          .delete()
          .eq('id', pdf.id);

        if (deleteError) {
          errors.push(`Failed to delete database record for ${pdf.file_name}: ${deleteError.message}`);
        } else {
          cleanedCount++;
        }
      } catch (error) {
        errors.push(`Failed to clean up ${pdf.file_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({ 
      message: `Cleaned up ${cleanedCount} expired PDFs`,
      cleaned: cleanedCount,
      totalFound: expiredPDFs.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ 
      error: 'Failed to clean up expired PDFs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}