import PdfExamComposer from '@/components/PdfExamComposer';
import ExamCreationForm from '@/components/ExamCreationForm';
import TeacherAnalyticsCards, { TeacherRecentAttempts } from '@/components/teacher/TeacherAnalyticsCards';
import NotificationPanel from '@/components/shared/NotificationPanel';
import Link from 'next/link';

export default function TeacherDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Teacher dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">Upload PDFs, generate exams, and review analytics</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Create AI-assisted exams from PDFs or images, publish to students, and monitor session analytics in real time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationPanel dark />
            <Link href="/auth" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">
              Account
            </Link>
          </div>
        </div>

        <TeacherAnalyticsCards />
        <TeacherRecentAttempts />

        <PdfExamComposer />

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-2xl font-semibold">Create exam manually</h2>
          <p className="mt-2 text-slate-300">Save a blank exam shell, then add questions via the PDF assistant above.</p>
          <div className="mt-4">
            <ExamCreationForm />
          </div>
        </div>
      </div>
    </main>
  );
}
