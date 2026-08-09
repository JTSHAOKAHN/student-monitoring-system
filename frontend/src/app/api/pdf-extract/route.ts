import { NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/gemini';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { pdfId } = await request.json();

    if (!pdfId) {
      return NextResponse.json({ error: 'PDF ID is required.' }, { status: 400 });
    }

    const { supabase, profile, teacher } = await getAuthenticatedProfile();

    if (!profile || profile.role !== 'teacher' || !teacher) {
      return NextResponse.json({ error: 'Only teachers can extract content.' }, { status: 401 });
    }

    // Get PDF record
    const { data: pdfRecord, error: pdfError } = await supabase
      .from('pdf_uploads')
      .select('*')
      .eq('id', pdfId)
      .single();

    if (pdfError || !pdfRecord) {
      return NextResponse.json({ error: 'PDF not found.' }, { status: 404 });
    }

    // Check if already extracted
    const { data: existingContent } = await supabase
      .from('extracted_content')
      .select('id')
      .eq('source_document_id', pdfId)
      .maybeSingle();

    if (existingContent) {
      return NextResponse.json({ 
        message: 'Content already extracted',
        contentId: existingContent.id 
      });
    }

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('pdfs')
      .download(pdfRecord.storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download PDF from storage.' }, { status: 500 });
    }

    // Create File object from downloaded data
    const file = new File([fileData], pdfRecord.file_name, { type: pdfRecord.mime_type });

    // Extract text using Gemini
    const extractedContent = await extractTextFromPDF(file, pdfRecord.file_name);

    // Store extracted content permanently
    const contentInserts = extractedContent.map(content => ({
      source_document_id: pdfId,
      content: content.content,
      content_type: content.content_type,
      page_number: content.page_number,
      section_title: content.section_title,
    }));

    const { error: insertError } = await supabase
      .from('extracted_content')
      .insert(contentInserts);

    if (insertError) {
      console.error('Failed to insert extracted content:', insertError);
      return NextResponse.json({ 
        error: 'Failed to store extracted content.',
        details: insertError.message 
      }, { status: 500 });
    }

    // Update PDF record extraction status
    await supabase
      .from('pdf_uploads')
      .update({ 
        extraction_status: 'completed',
        processing_status: 'extracted'
      })
      .eq('id', pdfId);

    return NextResponse.json({ 
      success: true,
      message: 'Content extracted and stored permanently',
      extractedCount: extractedContent.length
    });
  } catch (error) {
    console.error('Content extraction error:', error);
    return NextResponse.json({ 
      error: 'Failed to extract content.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}