import { NextResponse } from 'next/server';
import { generateQuestionsFromFile, extractTextFromPDF } from '@/lib/gemini';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Only PDF files are allowed for document upload.',
        details: `Received file type: ${file.type}`
      }, { status: 400 });
    }

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ 
        error: 'File must have .pdf extension.',
        details: `Received filename: ${file.name}`
      }, { status: 400 });
    }

    // Validate file size (50MB limit)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File size exceeds 50MB limit.',
        details: `File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB, Maximum: 50MB`
      }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
    }

    const { supabase, profile, teacher } = await getAuthenticatedProfile();

    if (!profile || profile.role !== 'teacher' || !teacher) {
      return NextResponse.json({ error: 'Only teachers can upload materials.' }, { status: 401 });
    }

    const count = Number(formData.get('count') || 5);
    const difficulty = (formData.get('difficulty') as 'easy' | 'medium' | 'hard' | 'mixed') || 'medium';
    const topicFocus = (formData.get('topicFocus') as string) || '';

    // Update processing status to 'processing'
    const processingStartTime = new Date();
    
    // Generate unique storage path with teacher ID for organization
    const fileName = `${teacher.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `pdfs/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage.from('pdfs').upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload file to storage.',
        details: uploadError.message 
      }, { status: 500 });
    }

    // Insert PDF record with full metadata and expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    const { data: pdfRow, error: pdfInsertError } = await supabase
      .from('pdf_uploads')
      .insert({
        teacher_id: teacher.id,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_at: processingStartTime.toISOString(),
        expires_at: expiresAt.toISOString(),
        processing_status: 'processing',
        extraction_status: 'in_progress',
      })
      .select('id')
      .single();

    if (pdfInsertError || !pdfRow) {
      console.error('PDF record insert error:', pdfInsertError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('pdfs').remove([storagePath]);
      return NextResponse.json({ 
        error: 'Failed to record uploaded file in database.',
        details: pdfInsertError?.message 
      }, { status: 500 });
    }

    try {
      // Step 1: Extract text content permanently
      await supabase
        .from('pdf_uploads')
        .update({ processing_status: 'extracting' })
        .eq('id', pdfRow.id);

      const extractedContent = await extractTextFromPDF(file, file.name);

      // Store extracted content permanently
      const contentInserts = extractedContent.map(content => ({
        source_document_id: pdfRow.id,
        content: content.content,
        content_type: content.content_type,
        page_number: content.page_number,
        section_title: content.section_title,
      }));

      const { error: contentInsertError } = await supabase
        .from('extracted_content')
        .insert(contentInserts);

      if (contentInsertError) {
        console.error('Failed to insert extracted content:', contentInsertError);
        // Continue processing, but log the error
      }

      // Update extraction status
      await supabase
        .from('pdf_uploads')
        .update({ 
          extraction_status: 'completed',
          processing_status: 'generating_questions'
        })
        .eq('id', pdfRow.id);

      // Step 2: Generate questions from extracted content
      const questions = await generateQuestionsFromFile(file, file.name, {
        count,
        difficulty,
        topicFocus,
      });

      // Store questions in question bank permanently
      const questionBankInserts = questions.map((q, index) => ({
        created_by: teacher.id,
        source_document_id: pdfRow.id,
        question_text: q.prompt,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        difficulty: q.difficulty,
        source_page_number: extractedContent[0]?.page_number,
        source_section: extractedContent[0]?.section_title,
      }));

      const { error: questionBankError } = await supabase
        .from('question_bank')
        .insert(questionBankInserts);

      if (questionBankError) {
        console.error('Failed to insert questions to bank:', questionBankError);
        // Continue with AI generated questions as fallback
      }

      // Store AI generated questions (with set null instead of cascade)
      const { error: aiError } = await supabase.from('ai_generated_questions').insert({
        pdf_upload_id: pdfRow.id,
        content: { questions },
      });

      if (aiError) {
        console.error('AI questions insert error:', aiError);
        // Don't fail the whole process, just log the error
      }

      // Update status to 'ready'
      await supabase
        .from('pdf_uploads')
        .update({ processing_status: 'ready' })
        .eq('id', pdfRow.id);

      return NextResponse.json({ 
        questions, 
        pdfId: pdfRow.id,
        expiresAt: expiresAt.toISOString(),
        extractedContentCount: extractedContent.length,
        message: 'PDF processed successfully. Content extracted and stored permanently.'
      });
    } catch (processingError) {
      console.error('PDF processing error:', processingError);
      
      // Update status to 'failed'
      await supabase
        .from('pdf_uploads')
        .update({ 
          processing_status: 'failed',
          extraction_status: 'failed'
        })
        .eq('id', pdfRow.id);

      return NextResponse.json({ 
        error: 'Failed to process PDF file.',
        details: processingError instanceof Error ? processingError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to process file.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
