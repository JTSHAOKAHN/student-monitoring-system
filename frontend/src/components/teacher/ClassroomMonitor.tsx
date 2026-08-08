'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface StudentStatus {
  id: string;
  student_number: number;
  display_name: string;
  is_logged_in: boolean;
  last_login_at: string | null;
  last_activity_at: string | null;
  status: 'not_logged_in' | 'active' | 'idle' | 'writing_exam' | 'disconnected' | 'exam_completed';
  current_exam: string | null;
  attempt_id: string | null;
  last_activity_text: string;
}

interface ClassroomSummary {
  total: number;
  logged_in: number;
  writing: number;
  not_started: number;
  disconnected: number;
  completed: number;
}

export default function ClassroomMonitor() {
  const [students, setStudents] = useState<StudentStatus[]>([]);
  const [summary, setSummary] = useState<ClassroomSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState('');

  useEffect(() => {
    async function fetchClassroomStatus() {
      try {
        const response = await fetch('/api/teacher/classroom');
        if (response.ok) {
          const data = await response.json();
          setStudents(data.students || []);
          setSummary(data.summary || null);
        }
      } catch (error) {
        console.error('Failed to fetch classroom status:', error);
      } finally {
        setLoading(false);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    }

    fetchClassroomStatus();
    const interval = setInterval(fetchClassroomStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusDisplay = (status: StudentStatus['status']) => {
    switch (status) {
      case 'active':
        return { emoji: '🟢', label: 'Active', color: 'text-green-700 bg-green-50' };
      case 'idle':
        return { emoji: '🟡', label: 'Idle', color: 'text-yellow-700 bg-yellow-50' };
      case 'writing_exam':
        return { emoji: '🔵', label: 'Writing Exam', color: 'text-blue-700 bg-blue-50' };
      case 'not_logged_in':
        return { emoji: '⚪', label: 'Not Logged In', color: 'text-slate-500 bg-slate-50' };
      case 'disconnected':
        return { emoji: '🟠', label: 'Disconnected', color: 'text-orange-700 bg-orange-50' };
      case 'exam_completed':
        return { emoji: '✅', label: 'Exam Completed', color: 'text-emerald-700 bg-emerald-50' };
      default:
        return { emoji: '⚪', label: 'Unknown', color: 'text-slate-500 bg-slate-50' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500">Loading classroom status...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-violet-600">ExamGuardian</p>
            <h1 className="text-2xl font-normal text-slate-800">Classroom Monitoring</h1>
          </div>
          <div className="text-xs text-slate-400">
            Last updated: {lastRefreshed}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Summary Cards */}
        {summary && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-semibold text-slate-800">{summary.total}</div>
              <div className="mt-1 text-xs text-slate-500">Total Students</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-semibold text-green-600">{summary.logged_in}</div>
              <div className="mt-1 text-xs text-slate-500">Logged In</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-semibold text-blue-600">{summary.writing}</div>
              <div className="mt-1 text-xs text-slate-500">Writing</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-semibold text-slate-400">{summary.not_started}</div>
              <div className="mt-1 text-xs text-slate-500">Not Started</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-semibold text-orange-600">{summary.disconnected}</div>
              <div className="mt-1 text-xs text-slate-500">Disconnected</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-semibold text-emerald-600">{summary.completed}</div>
              <div className="mt-1 text-xs text-slate-500">Completed</div>
            </div>
          </div>
        )}

        {/* Students Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-medium text-slate-800">Student Status</h2>
            <p className="mt-1 text-sm text-slate-500">Real-time classroom presence and activity monitoring</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Exam</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Last Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const statusDisplay = getStatusDisplay(student.status);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">Student {student.student_number}</div>
                        <div className="text-sm text-slate-500">{student.display_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusDisplay.color}`}>
                          {statusDisplay.emoji} {statusDisplay.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {student.current_exam || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {student.last_activity_text}
                      </td>
                      <td className="px-6 py-4">
                        {student.attempt_id && (
                          <Link
                            href={`/teacher/timeline/${student.attempt_id}`}
                            className="text-sm font-medium text-violet-600 hover:text-violet-700"
                          >
                            View Timeline
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
