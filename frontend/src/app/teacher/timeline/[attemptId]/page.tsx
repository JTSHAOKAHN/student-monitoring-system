import TimelinePage from '@/components/teacher/TimelinePage';

export default async function TeacherTimelineRoute({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  return <TimelinePage attemptId={attemptId} />;
}
