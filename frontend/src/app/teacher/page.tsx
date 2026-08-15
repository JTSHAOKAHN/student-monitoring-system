import PdfExamComposer from '@/components/PdfExamComposer';
import ExamCreationForm from '@/components/ExamCreationForm';
import TeacherAnalyticsCards, { TeacherRecentAttempts } from '@/components/teacher/TeacherAnalyticsCards';
import NotificationPanel from '@/components/shared/NotificationPanel';
import Link from 'next/link';

export default function TeacherDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-violet-600">Teacher Dashboard</p>
            <h1 className="mt-2 text-3xl font-normal text-slate-800">Exam Management & Analytics</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              Create AI-assisted exams directly from PDFs using Gemini AI. Upload PDFs, process with AI, and publish to students.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/teacher/classroom"
              className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
            >
              Classroom Monitor
            </Link>
            <NotificationPanel />
            <Link href="/auth" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Account
            </Link>
          </div>
        </div>

        <TeacherAnalyticsCards />
        <TeacherRecentAttempts />

        <PdfExamComposer />

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-medium text-slate-800">Create Exam Manually</h2>
          <p className="mt-2 text-sm text-slate-600">Save a blank exam shell, then add questions via the PDF assistant above.</p>
          <div className="mt-4">
            <ExamCreationForm />
          </div>
        </div>
      </div>
    </main>
  );
}
