'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NotificationPanel from '@/components/shared/NotificationPanel';
import type { StudentExamSummary } from '@/lib/types';

export default function StudentDashboard() {
  const [exams, setExams] = useState<StudentExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/student/exams');
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to load exams');
        setLoading(false);
        return;
      }
      setExams(data.exams || []);
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-violet-600">ExamGuardian</p>
            <h1 className="text-2xl font-normal text-slate-800">Student Portal</h1>
          </div>
          <NotificationPanel />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800">Available exams</h2>
          <p className="mt-1 text-sm text-slate-500">Select an exam to begin. Your activity will be monitored during the session.</p>
        </section>

        {loading && <p className="text-slate-500">Loading exams...</p>}
        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {!loading && !error && exams.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-slate-600">No published exams yet.</p>
            <p className="mt-1 text-sm text-slate-400">Your teacher will notify you when a new exam is available.</p>
          </div>
        )}

        <div className="grid gap-4">
          {exams.map((exam) => (
            <article key={exam.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-medium text-slate-800">{exam.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">{exam.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">{exam.question_count} questions</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">{exam.duration_minutes} min</span>
                    {exam.attempt_status === 'submitted' && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">Submitted</span>
                    )}
                    {exam.attempt_status === 'in_progress' && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">In progress</span>
                    )}
                  </div>
                </div>

                {exam.attempt_status === 'submitted' ? (
                  <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-500">Completed</span>
                ) : (
                  <Link
                    href={`/student/exam/${exam.id}`}
                    className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
                  >
                    {exam.attempt_status === 'in_progress' ? 'Continue exam' : 'Start exam'}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
