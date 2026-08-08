'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ActivityTimeline from '@/components/teacher/ActivityTimeline';
import CheatingRiskPanel from '@/components/teacher/CheatingRiskPanel';
import FocusHeatmap from '@/components/teacher/FocusHeatmap';
import type { HeatmapCell, TimelineEntry } from '@/lib/types';

export default function TimelinePage({ attemptId }: { attemptId: string }) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [analytics, setAnalytics] = useState<{
    focus_score: number;
    cheating_risk: number;
    heatmap_data: HeatmapCell[];
    event_summary: { flaggedEvents?: number };
  } | null>(null);
  const [attempt, setAttempt] = useState<{ exams?: { title: string }; students?: { users?: { full_name: string } }; score: number | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/analytics/timeline/${attemptId}`);
      const data = await response.json();
      if (response.ok) {
        setTimeline(data.timeline || []);
        setAnalytics(data.analytics);
        setAttempt(data.attempt);
      }
      setLoading(false);
    }
    void load();
  }, [attemptId]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 p-6 text-white">Loading timeline...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/teacher" className="text-sm text-cyan-400 hover:underline">← Back to dashboard</Link>
            <h1 className="mt-2 text-2xl font-semibold">{attempt?.exams?.title || 'Exam timeline'}</h1>
            <p className="text-sm text-slate-400">
              {attempt?.students?.users?.full_name || 'Student'}
              {attempt?.score != null && ` · Score: ${attempt.score}%`}
            </p>
          </div>
        </div>

        {analytics && (
          <CheatingRiskPanel
            risk={Number(analytics.cheating_risk)}
            focusScore={Number(analytics.focus_score)}
            flaggedEvents={analytics.event_summary?.flaggedEvents ?? 0}
          />
        )}

        {analytics?.heatmap_data && <FocusHeatmap data={analytics.heatmap_data as HeatmapCell[]} />}

        <ActivityTimeline entries={timeline} />
      </div>
    </main>
  );
}
