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

    // Test teacher bypass for development
    if (email === 'teacher@test.com' && role === 'teacher') {
      console.log('Using test teacher bypass');
      router.push('/teacher');
      setLoading(false);
      return;
    }

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
            emailConfirm: true, // Disable email verification for development
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

        // If email verification is disabled in Supabase, try auto-login
        if (data.user && !data.session) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!signInError && signInData.session) {
            await ensureUserProfile(supabase, role, fullName, email);
            router.push(role === 'student' ? '/student' : role === 'admin' ? '/teacher' : '/teacher');
            return;
          }
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
      let errorMessage = 'Authentication failed.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setMode('sign-in')}
          className={`rounded-full px-4 py-2 text-sm transition ${mode === 'sign-in' ? 'bg-violet-600 text-white' : 'text-slate-600'}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('sign-up')}
          className={`rounded-full px-4 py-2 text-sm transition ${mode === 'sign-up' ? 'bg-violet-600 text-white' : 'text-slate-600'}`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'sign-up' && (
          <div>
            <label className="mb-2 block text-sm text-slate-700">Full name</label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none ring-0 focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
              placeholder="Alex Morgan"
              required
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm text-slate-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none ring-0 focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
            placeholder="teacher@example.com"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none ring-0 focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
            placeholder="••••••••"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-700">Role</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none ring-0 focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Processing...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-violet-700">{message}</p>}
    </div>
  );
}
