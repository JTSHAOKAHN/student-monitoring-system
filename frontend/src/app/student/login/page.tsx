import StudentLoginForm from '@/components/student/StudentLoginForm';
import Link from 'next/link';

export default function StudentLoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 text-slate-800">
      <div className="mx-auto max-w-lg px-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
          <div className="h-3 bg-violet-600" />
          <div className="p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-700">
                ExamGuardian • Classroom Portal
              </span>
              <Link href="/" className="text-xs text-slate-400 hover:underline">
                ← Back to Home
              </Link>
            </div>

            <h1 className="mt-4 text-2xl font-normal text-slate-800">Student Identification</h1>
            <p className="mt-2 text-sm text-slate-500">
              Select your assigned student identity (Student 1 to Student 35) to access your exam dashboard.
            </p>

            <div className="mt-6">
              <StudentLoginForm />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
