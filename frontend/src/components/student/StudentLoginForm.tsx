'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentLoginForm() {
  const router = useRouter();
  const [studentNumber, setStudentNumber] = useState<number>(1);
  const [passcode, setPasscode] = useState<string>('student123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentNumber, passcode }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      router.push('/student');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Select Assigned Student Identity
        </label>
        <select
          value={studentNumber}
          onChange={(e) => setStudentNumber(Number(e.target.value))}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-normal text-slate-800 outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
        >
          {Array.from({ length: 35 }, (_, i) => i + 1).map((num) => (
            <option key={num} value={num}>
              Student {num}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Student Passcode / PIN
        </label>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Enter your assigned PIN"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-normal text-slate-800 outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
          required
        />
        <p className="mt-1 text-xs text-slate-400">Default classroom passcode: student123</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-violet-600 px-6 py-3 text-base font-medium text-white shadow hover:bg-violet-700 disabled:opacity-60"
      >
        {loading ? 'Authenticating...' : `Sign in as Student ${studentNumber}`}
      </button>
    </form>
  );
}
