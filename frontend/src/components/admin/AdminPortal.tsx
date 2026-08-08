'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface AdminExam {
  id: string;
  title: string;
  published: boolean;
  created_at: string;
}

export default function AdminPortal() {
  const router = useRouter();
  const [view, setView] = useState<'overview' | 'users' | 'exams' | 'notifications'>('overview');
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, exams: 0, attempts: 0, flagged: 0 });
  const [activity, setActivity] = useState<Array<{ title: string; detail: string }>>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; type: string; created_at: string }>>([]);

  useEffect(() => {
    async function loadAdminData() {
      const response = await fetch('/api/admin');
      if (!response.ok) {
        router.replace('/admin/login');
        return;
      }

      const data = await response.json();
      setStats(data.overview ?? {});
      setActivity(data.activity ?? []);
      setUsers(data.users ?? []);
      setExams(data.exams ?? []);
      setNotifications(data.recentNotifications ?? []);
    }

    void loadAdminData();
  }, [router]);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  const statCards = [
    { label: 'Total users', value: stats.users },
    { label: 'Teachers', value: stats.teachers },
    { label: 'Students', value: stats.students },
    { label: 'Exams', value: stats.exams },
    { label: 'Attempts', value: stats.attempts },
    { label: 'Flagged sessions', value: stats.flagged },
  ];

  const content = useMemo(() => {
    if (view === 'users') {
      return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-slate-200">{user.full_name}</td>
                  <td className="px-4 py-3 text-slate-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300">{user.role}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="p-6 text-sm text-slate-400">No users registered yet.</p>}
        </div>
      );
    }

    if (view === 'exams') {
      return (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div key={exam.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3">
              <div>
                <p className="font-medium text-slate-200">{exam.title}</p>
                <p className="text-xs text-slate-500">{new Date(exam.created_at).toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${exam.published ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                {exam.published ? 'Published' : 'Draft'}
              </span>
            </div>
          ))}
          {exams.length === 0 && <p className="text-sm text-slate-400">No exams created yet.</p>}
        </div>
      );
    }

    if (view === 'notifications') {
      return (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm">
              <span className="font-medium text-slate-200">{n.title}</span>
              <span className="ml-2 text-xs text-slate-500">{n.type}</span>
            </li>
          ))}
          {notifications.length === 0 && <p className="text-sm text-slate-400">No notifications sent yet.</p>}
        </ul>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold">System health</h2>
          <p className="mt-2 text-sm text-slate-400">
            Platform is connected to Supabase. Admin auth is separate from user auth via env credentials.
          </p>
          <Link href="/api/health" className="mt-4 inline-block text-sm text-cyan-400 hover:underline">
            Check API health →
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold">Recent activity</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            {activity.map((item, i) => (
              <li key={i} className="rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2">
                <span className="font-medium text-slate-200">{item.title}</span>: {item.detail}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }, [view, users, exams, notifications, activity]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin portal</p>
            <h1 className="mt-2 text-3xl font-semibold">Platform oversight</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Manage users, review exams, monitor flagged sessions, and inspect system activity.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Sign out
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {(['overview', 'users', 'exams', 'notifications'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setView(tab)}
              className={`rounded-full px-4 py-2 text-sm capitalize ${view === tab ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {content}
      </div>
    </main>
  );
}
