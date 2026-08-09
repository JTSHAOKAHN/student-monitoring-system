import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { supabase, profile, teacher } = await getAuthenticatedProfile();

    if (!profile || profile.role !== 'teacher' || !teacher) {
      return NextResponse.json({ error: 'Only teachers can view PDFs.' }, { status: 401 });
    }

    // Get PDFs for this teacher
    const { data: pdfs, error } = await supabase
      .from('pdf_uploads')
      .select('*')
      .eq('teacher_id', teacher.id)
      .order('uploaded_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch PDFs' }, { status: 500 });
    }

    return NextResponse.json({ pdfs: pdfs || [] });
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}