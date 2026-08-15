import { NextResponse } from 'next/server';
import { processPDFWithGemini } from '@/lib/gemini';
import { createClient } from '@supabase/supabase-js';

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

    // TEMPORARY: Use service client for testing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // TEMPORARY: Use a default teacher ID for testing
    const { data: teacherData } = await supabase.from('teachers').select('id').limit(1).maybeSingle();
    const teacherId = teacherData?.id || '00000000-0000-0000-0000-000000000000';

    const count = Number(formData.get('count') || 5);
    const difficulty = (formData.get('difficulty') as 'easy' | 'medium' | 'hard' | 'mixed') || 'medium';
    const topicFocus = (formData.get('topicFocus') as string) || '';

    // Process PDF directly with Gemini (no storage needed)
    const processingStartTime = new Date();
    
    const { extractedContent, questions } = await processPDFWithGemini(file, file.name, {
      count,
      difficulty,
      topicFocus,
    });

    // Create a simple content record for tracking (no PDF storage)
    const { data: contentRow, error: contentInsertError } = await supabase
      .from('extracted_content')
      .insert({
        source_document_id: null, // No PDF document needed
        content: `Generated from ${file.name} via Gemini AI`,
        content_type: 'text',
        page_number: 1,
        section_title: 'AI Generated',
      })
      .select('id')
      .single();

    if (contentInsertError) {
      console.error('Failed to insert content record:', contentInsertError);
    }

    // Store questions in question bank permanently
    const questionBankInserts = questions.map((q, index) => ({
      created_by: teacherId,
      source_content_id: contentRow?.id || null,
      source_document_id: null, // No PDF document needed
      question_text: q.prompt,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      difficulty: q.difficulty,
      source_page_number: 1,
      source_section: 'AI Generated',
    }));

    const { error: questionBankError } = await supabase
      .from('question_bank')
      .insert(questionBankInserts);

    if (questionBankError) {
      console.error('Failed to insert questions to bank:', questionBankError);
    }

    return NextResponse.json({ 
      questions, 
      extractedContent,
      contentId: contentRow?.id || null,
      message: 'PDF processed successfully via Gemini AI. Questions generated and stored permanently without PDF storage.',
      processingTime: `${Date.now() - processingStartTime.getTime()}ms`
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to process file.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}