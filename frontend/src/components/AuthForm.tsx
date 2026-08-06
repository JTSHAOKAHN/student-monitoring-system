'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/profile';

type AuthMode = 'sign-in' | 'sign-up';
type Role = 'teacher' | 'student' | 'admin';

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('teacher');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    if (!supabase) {
      setMessage('Supabase is not configured yet.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          await ensureUserProfile(supabase, role, fullName, email);
          router.push(role === 'student' ? '/student' : role === 'admin' ? '/teacher' : '/teacher');
          return;
        }

        setMessage('Account created. Please check your email for the confirmation link.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        const userRole = (data.user?.user_metadata?.role as Role | undefined) || role;
        await ensureUserProfile(supabase, userRole, undefined, email);
        router.push(userRole === 'student' ? '/student' : '/teacher');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Authentication failed.';
      setMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-cyan-500/10">
      <div className="mb-6 flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setMode('sign-in')}
          className={`rounded-full px-4 py-2 text-sm transition ${mode === 'sign-in' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('sign-up')}
          className={`rounded-full px-4 py-2 text-sm transition ${mode === 'sign-up' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'}`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'sign-up' && (
          <div>
            <label className="mb-2 block text-sm text-slate-300">Full name</label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-0"
              placeholder="Alex Morgan"
              required
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm text-slate-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-0"
            placeholder="teacher@example.com"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-0"
            placeholder="••••••••"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">Role</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-0"
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Processing...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-cyan-300">{message}</p>}
    </div>
  );
}
