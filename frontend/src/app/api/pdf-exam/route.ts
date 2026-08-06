import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { extractPdfText, generateExamQuestionsFromText } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can upload PDFs.' }, { status: 403 });
    }

    const extractedText = await extractPdfText(file);
    const questions = await generateExamQuestionsFromText(extractedText, file.name);

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
        teacher_id: profile.id,
        file_name: file.name,
        storage_path: storagePath,
      })
      .select('id')
      .single();

    if (pdfInsertError || !pdfRow) {
      return NextResponse.json({ error: 'Failed to record uploaded PDF.' }, { status: 400 });
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
    return NextResponse.json({ error: 'Failed to process PDF.' }, { status: 500 });
  }
}
