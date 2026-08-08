import GoogleFormsExam from '@/components/student/GoogleFormsExam';

export default async function StudentExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  return <GoogleFormsExam examId={examId} />;
}
