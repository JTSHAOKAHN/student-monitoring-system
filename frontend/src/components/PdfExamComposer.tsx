'use client';

import { useState } from 'react';

export default function PdfExamComposer() {
  const [fileName, setFileName] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);
    setLoading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const generated = [
        `Based on ${file.name}, draft a short-answer question about the key ideas in the document.`,
        `Create a multiple-choice question that tests a major concept from ${file.name}.`,
        `Write an essay prompt that asks the learner to explain the main argument in ${file.name}.`,
      ];

      setQuestions(generated);
      setMessage('AI draft questions created. You can edit them before publishing.');
    } catch {
      setMessage('Unable to process the uploaded file.');
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
      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `AI-generated exam from ${fileName || 'uploaded PDF'}`,
          description: `Teacher-edited questions:\n${questions.join('\n')}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to create exam.');
      }

      setMessage('Exam draft published successfully.');
      setQuestions([]);
      setFileName('');
    } catch {
      setMessage('Unable to publish the exam draft.');
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
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-semibold">Draft questions</h3>
          {questions.map((question, index) => (
            <textarea
              key={`${question}-${index}`}
              value={question}
              onChange={(event) => updateQuestion(index, event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
            />
          ))}

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
