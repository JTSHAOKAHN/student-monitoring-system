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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <div>
        <label className="mb-2 block text-sm text-slate-700">Exam title</label>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800"
          placeholder="Midterm Algebra"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-700">Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800"
          placeholder="Describe the exam, grading expectations, or class context."
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? 'Creating...' : 'Create exam'}
      </button>

      {message && <p className="text-sm text-violet-700">{message}</p>}
    </form>
  );
}
