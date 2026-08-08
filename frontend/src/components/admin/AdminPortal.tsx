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

interface LoginActivity {
  title: string;
  detail: string;
  time: string;
  role: string;
}

export default function AdminPortal() {
  const router = useRouter();
  const [view, setView] = useState<'overview' | 'users' | 'exams' | 'notifications' | 'activity'>('overview');
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, exams: 0, attempts: 0, flagged: 0, active_sessions: 0 });
  const [activity, setActivity] = useState<Array<{ title: string; detail: string }>>([]);
  const [loginActivity, setLoginActivity] = useState<LoginActivity[]>([]);
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
      setLoginActivity(data.loginActivity ?? []);
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
    { label: 'Active sessions', value: stats.active_sessions },
    { label: 'Flagged sessions', value: stats.flagged },
  ];

  const content = useMemo(() => {
    if (view === 'users') {
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-800">{user.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">{user.role}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="p-6 text-sm text-slate-600">No users registered yet.</p>}
        </div>
      );
    }

    if (view === 'exams') {
      return (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div key={exam.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="font-medium text-slate-800">{exam.title}</p>
                <p className="text-xs text-slate-500">{new Date(exam.created_at).toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${exam.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {exam.published ? 'Published' : 'Draft'}
              </span>
            </div>
          ))}
          {exams.length === 0 && <p className="text-sm text-slate-600">No exams created yet.</p>}
        </div>
      );
    }

    if (view === 'notifications') {
      return (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <span className="font-medium text-slate-800">{n.title}</span>
              <span className="ml-2 text-xs text-slate-500">{n.type}</span>
            </li>
          ))}
          {notifications.length === 0 && <p className="text-sm text-slate-600">No notifications sent yet.</p>}
        </ul>
      );
    }

    if (view === 'activity') {
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {loginActivity.map((activity, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-800">{activity.title}</td>
                  <td className="px-4 py-3 text-slate-600">{activity.detail}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      activity.role === 'teacher' ? 'bg-violet-100 text-violet-700' :
                      activity.role === 'student' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {activity.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{activity.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loginActivity.length === 0 && <p className="p-6 text-sm text-slate-600">No login activity recorded yet.</p>}
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-medium text-slate-800">System health</h2>
          <p className="mt-2 text-sm text-slate-600">
            Platform is connected to Supabase. Admin auth is separate from user auth via env credentials.
          </p>
          <Link href="/api/health" className="mt-4 inline-block text-sm text-violet-600 hover:underline">
            Check API health →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-medium text-slate-800">Recent activity</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {activity.map((item, i) => (
              <li key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-800">{item.title}</span>: {item.detail}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }, [view, users, exams, notifications, activity, loginActivity]);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-violet-600">Admin portal</p>
            <h1 className="mt-2 text-3xl font-normal text-slate-800">Platform oversight</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              Manage users, review exams, monitor flagged sessions, and inspect system activity.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-600">{item.label}</p>
              <p className="mt-2 text-2xl font-medium text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {(['overview', 'users', 'exams', 'notifications', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setView(tab)}
              className={`rounded-full px-4 py-2 text-sm capitalize ${view === tab ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
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
