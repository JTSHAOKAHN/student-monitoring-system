'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AnalyticsCards {
  totalExams: number;
  publishedExams: number;
  activeSessions: number;
  avgFocusScore: number;
  avgCheatingRisk: number;
  flaggedStudents: number;
  completionRate: number;
}

export default function TeacherAnalyticsCards() {
  const [cards, setCards] = useState<AnalyticsCards | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/teacher/analytics');
      if (response.ok) {
        const data = await response.json();
        setCards(data.cards);
      }
    }
    void load();
  }, []);

  if (!cards) {
    return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
    ))}</div>;
  }

  const items = [
    { title: 'Total exams', value: cards.totalExams, sub: `${cards.publishedExams} published`, color: 'text-violet-600' },
    { title: 'Avg focus score', value: `${cards.avgFocusScore}%`, sub: 'Across submissions', color: 'text-emerald-600' },
    { title: 'Cheating risk', value: `${cards.avgCheatingRisk}%`, sub: `${cards.flaggedStudents} flagged`, color: cards.avgCheatingRisk >= 40 ? 'text-red-600' : 'text-amber-600' },
    { title: 'Completion rate', value: `${cards.completionRate}%`, sub: `${cards.activeSessions} active now`, color: 'text-blue-600' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{item.title}</p>
          <p className={`mt-2 text-3xl font-semibold ${item.color}`}>{item.value}</p>
          <p className="mt-1 text-xs text-slate-400">{item.sub}</p>
        </div>
      ))}
    </div>
  );
}

export function TeacherRecentAttempts() {
  const [attempts, setAttempts] = useState<Array<{ id: string; exam_id?: string; status: string; score: number | null; exams?: { id?: string; title: string } }>>([]);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/teacher/analytics');
      if (response.ok) {
        const data = await response.json();
        setAttempts(data.recentAttempts || []);
      }
    }
    void load();
  }, []);

  if (attempts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-slate-800">Recent attempts</h3>
        <p className="mt-2 text-sm text-slate-500">No student attempts yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-800">Recent student attempts</h3>
        <span className="text-xs text-slate-400">Real-time telemetry tracked</span>
      </div>
      <ul className="mt-4 space-y-2">
        {attempts.map((attempt) => {
          const eId = attempt.exam_id || attempt.exams?.id;
          return (
            <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <span className="font-medium text-slate-700">{attempt.exams?.title || 'Exam'}</span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs text-slate-600">{attempt.status}</span>
                {attempt.score != null && <span className="font-semibold text-violet-600">{attempt.score}%</span>}
                <Link href={`/teacher/timeline/${attempt.id}`} className="text-xs text-violet-600 hover:underline">
                  Timeline
                </Link>
                {eId && (
                  <>
                    <Link href={`/teacher/live/${eId}`} className="text-xs text-emerald-600 hover:underline">
                      Live Grid
                    </Link>
                    <a href={`/api/teacher/export-report/${eId}`} download className="text-xs text-slate-500 hover:text-slate-700 hover:underline">
                      CSV
                    </a>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

