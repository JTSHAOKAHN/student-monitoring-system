'use client';

import { useState } from 'react';

export default function PdfExamComposer() {
  const [fileName, setFileName] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
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
    setDescription('Teacher-edited questions generated from the uploaded PDF.');
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
      setMessage('AI draft questions created. You can edit them before publishing.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to process the uploaded file.');
    } finally {
      setLoading(false);
    }
  }

  function updateQuestion(index: number, value: string) {
    setQuestions((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  async function handlePublish() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/exams/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          questions: questions.filter(Boolean),
          pdfId,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to publish the exam draft.');
      }

      setMessage('Exam draft published successfully.');
      setQuestions([]);
      setFileName('');
      setTitle('');
      setDescription('');
      setPdfId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to publish the exam draft.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold">PDF to exam assistant</h2>
      <p className="mt-2 text-sm text-slate-400">Upload a PDF, let the AI draft questions, and edit them before publishing.</p>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-400/30 bg-slate-950/70 p-8 text-center">
        <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
        <span className="text-lg font-medium">Upload PDF</span>
        <span className="mt-2 text-sm text-slate-400">{fileName || 'Choose a PDF to create draft questions'}</span>
      </label>

      {questions.length > 0 && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Exam title</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Exam description</label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </div>

          <div>
            <h3 className="text-lg font-semibold">Draft questions</h3>
            {questions.map((question, index) => (
              <textarea
                key={`${question}-${index}`}
                value={question}
                onChange={(event) => updateQuestion(index, event.target.value)}
                className="mt-3 min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handlePublish}
            disabled={loading}
            className="rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Publishing...' : 'Publish exam draft'}
          </button>
        </div>
      )}

      {message && <p className="mt-4 text-sm text-cyan-300">{message}</p>}
    </div>
  );
}
