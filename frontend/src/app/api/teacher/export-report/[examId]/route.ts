import { NextResponse } from 'next/server';
import { generateExamCsvReport } from '@/lib/reporting';
import { getAuthenticatedProfile } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { profile, teacher } = await getAuthenticatedProfile();
    if (!profile || profile.role !== 'teacher' || !teacher) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { examId } = await params;
    const csvContent = await generateExamCsvReport(examId);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="exam-report-${examId}.csv"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to export report.' }, { status: 500 });
  }
}
