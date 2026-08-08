import { NextResponse } from 'next/server';
import { generateQuestionsFromFile } from '@/lib/gemini';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Upload a PDF or image (PNG, JPEG, WebP).' }, { status: 400 });
    }

    const { supabase, profile, teacher } = await getAuthenticatedProfile();

    if (!profile || profile.role !== 'teacher' || !teacher) {
      return NextResponse.json({ error: 'Only teachers can upload materials.' }, { status: 401 });
    }

    const questions = await generateQuestionsFromFile(file, file.name);

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `pdfs/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('pdfs').upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data: pdfRow, error: pdfInsertError } = await supabase
      .from('pdf_uploads')
      .insert({
        teacher_id: teacher.id,
        file_name: file.name,
        storage_path: storagePath,
      })
      .select('id')
      .single();

    if (pdfInsertError || !pdfRow) {
      return NextResponse.json({ error: 'Failed to record uploaded file.' }, { status: 400 });
    }

    const { error: aiError } = await supabase.from('ai_generated_questions').insert({
      pdf_upload_id: pdfRow.id,
      content: { questions },
    });

    if (aiError) {
      return NextResponse.json({ error: aiError.message }, { status: 400 });
    }

    return NextResponse.json({ questions, pdfId: pdfRow.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to process file.' }, { status: 500 });
  }
}
