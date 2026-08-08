'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NotificationPanel from '@/components/shared/NotificationPanel';
import type { StudentExamSummary } from '@/lib/types';

export default function StudentDashboard() {
  const router = useRouter();
  const [exams, setExams] = useState<StudentExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<{ studentNumber: number; displayName: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function load() {
      // Load student info from cookie
      const response = await fetch('/api/student/info');
      const studentData = await response.json();
      if (response.ok) {
        setStudentInfo(studentData);
      } else {
        // Redirect to login if not authenticated
        router.push('/student/login');
        return;
      }

      // Load exams
      const examsResponse = await fetch('/api/student/exams');
      const examsData = await examsResponse.json();
      if (!examsResponse.ok) {
        setError(examsData.error || 'Unable to load exams');
        setLoading(false);
        return;
      }
      setExams(examsData.exams || []);
      setLoading(false);
    }
    void load();
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/student/logout', { method: 'POST' });
      router.push('/student/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-violet-600">ExamGuardian</p>
            <h1 className="text-2xl font-normal text-slate-800">
              {studentInfo ? `Student ${studentInfo.studentNumber}` : 'Student Portal'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationPanel />
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800">Available Exams</h2>
          <p className="mt-1 text-sm text-slate-500">Select an exam to begin. Your activity will be monitored during the session.</p>
        </section>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500">Loading available exams...</div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && exams.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-lg font-medium text-slate-700">No exams are currently available.</p>
            <p className="mt-2 text-sm text-slate-500">Check again later or contact your teacher.</p>
          </div>
        )}

        <div className="grid gap-4">
          {exams.map((exam) => {
            let statusBadge = null;
            let actionButton = null;

            if (exam.attempt_status === 'submitted') {
              statusBadge = <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Completed</span>;
              actionButton = <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-500">Completed</span>;
            } else if (exam.attempt_status === 'in_progress') {
              statusBadge = <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">In Progress</span>;
              actionButton = (
                <Link
                  href={`/student/exam/${exam.id}`}
                  className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
                >
                  Continue Exam
                </Link>
              );
            } else {
              actionButton = (
                <Link
                  href={`/student/exam/${exam.id}`}
                  className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
                >
                  Start Exam
                </Link>
              );
            }

            return (
              <article key={exam.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-medium text-slate-800">{exam.title}</h3>
                      {statusBadge}
                    </div>
                    <p className="mt-2 max-w-2xl text-sm text-slate-600">{exam.description}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1">{exam.question_count} Questions</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">{exam.duration_minutes} Minutes</span>
                    </div>
                  </div>

                  {actionButton}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
