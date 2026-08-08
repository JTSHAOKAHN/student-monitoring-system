import LiveProctorGrid from '@/components/teacher/LiveProctorGrid';
import Link from 'next/link';

export default async function TeacherLiveProctorPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <Link href="/teacher" className="text-xs text-cyan-400 hover:underline">
            ← Back to Teacher Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">Live Proctoring Room</h1>
        </div>

        <LiveProctorGrid examId={examId} />
      </div>
    </main>
  );
}
