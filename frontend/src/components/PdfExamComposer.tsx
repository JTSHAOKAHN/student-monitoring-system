'use client';

import { useState } from 'react';
import type { GeneratedQuestion } from '@/lib/types';

export default function PdfExamComposer() {
  const [fileName, setFileName] = useState('');
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pdfId, setPdfId] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);
    setTitle(`AI-generated exam from ${file.name}`);
    setDescription('Teacher-edited questions generated from uploaded material via Gemini.');
    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/pdf-exam', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to create draft questions.');
      }

      setQuestions(result.questions || []);
      setPdfId(result.pdfId || null);
      setMessage('Gemini draft questions created. Edit them, then save or publish.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to process the uploaded file.');
    } finally {
      setLoading(false);
    }
  }

  function updateQuestion(index: number, field: keyof GeneratedQuestion, value: string) {
    setQuestions((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSave(publish: boolean) {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/exams/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          questions: questions.filter((q) => q.prompt.trim()),
          pdfId,
          publish,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to save the exam.');
      }

      setMessage(publish ? 'Exam published! Students have been notified.' : 'Exam saved as draft.');
      setQuestions([]);
      setFileName('');
      setTitle('');
      setDescription('');
      setPdfId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save the exam.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold">PDF / image to exam (Gemini AI)</h2>
      <p className="mt-2 text-sm text-slate-400">
        Upload a PDF or image. Gemini reads text and visuals, then drafts multiple-choice and other question types.
      </p>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-400/30 bg-slate-950/70 p-8 text-center">
        <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
        <span className="text-lg font-medium">{loading ? 'Processing with Gemini...' : 'Upload PDF or image'}</span>
        <span className="mt-2 text-sm text-slate-400">{fileName || 'Supports PDF, PNG, JPEG, WebP'}</span>
      </label>

      {questions.length > 0 && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Exam title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Exam description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Draft questions</h3>
            {questions.map((question, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="mb-2 flex gap-2">
                  <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300">{question.question_type}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-400">{question.difficulty}</span>
                </div>
                <textarea
                  value={question.prompt}
                  onChange={(e) => updateQuestion(index, 'prompt', e.target.value)}
                  className="min-h-20 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                />
                {question.options && question.options.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {question.options.map((opt) => (
                      <li key={opt.id}>
                        {opt.id}. {opt.label}
                        {question.correct_answer === opt.id && ' ✓'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={loading}
              className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-70"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={loading}
              className="rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-70"
            >
              Publish & notify students
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-4 text-sm text-cyan-300">{message}</p>}
    </div>
  );
}
