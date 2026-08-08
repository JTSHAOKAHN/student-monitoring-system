'use client';

import { useEffect, useState } from 'react';

interface StudentStatus {
  attemptId: string;
  studentName: string;
  email: string;
  status: string;
  startedAt: string;
  focusScore: number;
  cheatingRisk: number;
  flaggedEvents: number;
  lastActive: string;
}

export default function LiveProctorGrid({ examId }: { examId: string }) {
  const [students, setStudents] = useState<StudentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    async function fetchLiveStatus() {
      try {
        const response = await fetch(`/api/analytics/exam/${examId}`);
        if (response.ok) {
          const data = await response.json();
          const items: StudentStatus[] = (data.attempts || []).map((att: any) => {
            const student = att.students?.users;
            const stats = data.analyticsMap?.[att.id] || {};
            return {
              attemptId: att.id,
              studentName: student?.full_name || 'Student',
              email: student?.email || 'N/A',
              status: att.status,
              startedAt: att.started_at,
              focusScore: stats.focus_score ?? 100,
              cheatingRisk: stats.cheating_risk ?? 0,
              flaggedEvents: stats.event_summary?.flaggedEvents ?? 0,
              lastActive: att.submitted_at || att.started_at || new Date().toISOString(),
            };
          });
          setStudents(items);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    }

    void fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 8000);
    return () => clearInterval(interval);
  }, [examId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading live proctor grid...</div>;
  }

  const activeCount = students.filter((s) => s.status === 'in_progress').length;
  const flaggedCount = students.filter((s) => s.cheatingRisk >= 40).length;

  return (
    <div className="space-y-6">
      {/* Live Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/90 p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 animate-ping rounded-full bg-emerald-500" />
            <h2 className="text-xl font-bold text-white">Live Exam Proctor Grid</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Auto-refreshing live telemetry • Last updated: {lastRefreshed}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
            <span className="text-slate-400">Active Students: </span>
            <span className="font-bold text-cyan-300">{activeCount}</span>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">
            <span className="opacity-80">Flagged Risk: </span>
            <span className="font-bold">{flaggedCount}</span>
          </div>
          <a
            href={`/api/teacher/export-report/${examId}`}
            download
            className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400"
          >
            📥 Export CSV Report
          </a>
        </div>
      </div>

      {/* Grid of Student Cards */}
      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-500">
          No students have started this exam yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => {
            const isHighRisk = student.cheatingRisk >= 60;
            const isMedRisk = student.cheatingRisk >= 30 && student.cheatingRisk < 60;
            const borderCol = isHighRisk
              ? 'border-red-500/40 bg-red-950/20'
              : isMedRisk
              ? 'border-amber-500/40 bg-amber-950/20'
              : 'border-white/10 bg-slate-900/80';

            return (
              <div key={student.attemptId} className={`rounded-2xl border p-5 transition ${borderCol}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white">{student.studentName}</h3>
                    <p className="text-xs text-slate-400">{student.email}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      student.status === 'submitted'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-cyan-500/20 text-cyan-300'
                    }`}
                  >
                    {student.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl border border-white/5 bg-slate-950/50 p-2">
                    <p className="text-slate-500">Focus</p>
                    <p className="mt-1 font-bold text-emerald-400">{student.focusScore}%</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-slate-950/50 p-2">
                    <p className="text-slate-500">Risk</p>
                    <p className={`mt-1 font-bold ${isHighRisk ? 'text-red-400' : 'text-amber-300'}`}>
                      {student.cheatingRisk}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-slate-950/50 p-2">
                    <p className="text-slate-500">Flags</p>
                    <p className="mt-1 font-bold text-white">{student.flaggedEvents}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs">
                  <a
                    href={`/teacher/timeline/${student.attemptId}`}
                    className="text-cyan-400 hover:underline"
                  >
                    View Timeline →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
