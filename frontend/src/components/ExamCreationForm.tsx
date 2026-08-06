'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ExamCreationForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.error || 'Unable to create exam');
      return;
    }

    setMessage('Exam created successfully.');
    setTitle('');
    setDescription('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-cyan-400/20 bg-slate-900/80 p-6">
      <div>
        <label className="mb-2 block text-sm text-slate-300">Exam title</label>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
          placeholder="Midterm Algebra"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-300">Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
          placeholder="Describe the exam, grading expectations, or class context."
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? 'Creating...' : 'Create exam'}
      </button>

      {message && <p className="text-sm text-cyan-300">{message}</p>}
    </form>
  );
}
