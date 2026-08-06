'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid administrator credentials.');
      }

      router.push('/admin');
    } catch {
      setError('Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin access</p>
          <h1 className="mt-2 text-3xl font-semibold">Developer portal</h1>
          <p className="mt-3 text-slate-300">Enter the hidden credentials to open the admin dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Username</label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? 'Checking access...' : 'Enter admin portal'}
          </button>
        </form>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}
