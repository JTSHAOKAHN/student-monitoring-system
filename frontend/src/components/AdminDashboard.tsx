'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState<'overview' | 'users' | 'exams'>('overview');
  const [stats, setStats] = useState([{ title: 'Total users', value: '—' }, { title: 'Teachers', value: '—' }, { title: 'Students', value: '—' }, { title: 'Exams', value: '—' }]);
  const [activity, setActivity] = useState<Array<{ title: string; detail: string }>>([]);

  useEffect(() => {
    async function loadAdminData() {
      const response = await fetch('/api/admin');
      if (!response.ok) {
        router.replace('/admin/login');
        return;
      }

      const data = await response.json();
      setStats([
        { title: 'Total users', value: String(data.overview?.users ?? 0) },
        { title: 'Teachers', value: String(data.overview?.teachers ?? 0) },
        { title: 'Students', value: String(data.overview?.students ?? 0) },
        { title: 'Exams', value: String(data.overview?.exams ?? 0) },
      ]);
      setActivity(data.activity ?? []);
    }

    loadAdminData();
  }, [router]);

  const content = useMemo(() => {
    if (view === 'users') {
      return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold">User management</h2>
          <p className="mt-2 text-sm text-slate-400">This area will eventually support role review, activation, and account controls.</p>
        </div>
      );
    }

    if (view === 'exams') {
      return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold">Exam oversight</h2>
          <p className="mt-2 text-sm text-slate-400">This area will later show published exams, drafts, and monitoring signals.</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold">System overview</h2>
          <p className="mt-2 text-sm text-slate-400">This view is now gated by a server-side session and is ready to show real monitoring data.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No activity captured yet. Once the app starts logging teacher actions, they will appear here.</p>
          ) : (
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-400">
              {activity.map((item) => (
                <li key={item.title}>
                  <span className="font-medium text-slate-200">{item.title}</span>: {item.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }, [activity, view]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin portal</p>
          <h1 className="mt-2 text-3xl font-semibold">Developer-only oversight dashboard</h1>
          <p className="mt-3 max-w-2xl text-slate-300">This hidden portal is reserved for the developer to inspect overall platform health and future admin controls.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
              <p className="text-sm text-slate-400">{item.title}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setView('overview')} className={`rounded-full px-4 py-2 text-sm ${view === 'overview' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>Overview</button>
          <button onClick={() => setView('users')} className={`rounded-full px-4 py-2 text-sm ${view === 'users' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>Users</button>
          <button onClick={() => setView('exams')} className={`rounded-full px-4 py-2 text-sm ${view === 'exams' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>Exams</button>
        </div>

        {content}
      </div>
    </main>
  );
}
