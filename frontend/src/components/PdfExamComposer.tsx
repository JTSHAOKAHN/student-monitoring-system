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

  // Custom AI Generation Controls
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [topicFocus, setTopicFocus] = useState('');

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setMessage('File exceeds 4MB limit. Please upload a smaller PDF or image.');
      return;
    }

    setFileName(file.name);
    setTitle(`Exam: ${file.name.replace(/\.[^/.]+$/, '')}`);
    setDescription(`AI-generated exam based on ${file.name}.`);
    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('count', String(count));
      formData.append('difficulty', difficulty);
      formData.append('topicFocus', topicFocus);

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
      setMessage('✨ AI generated questions! Review, edit, or publish below.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to process the uploaded file.');
    } finally {
      setLoading(false);
    }
  }

  function updateQuestion(index: number, field: keyof GeneratedQuestion, value: unknown) {
    setQuestions((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  }

  function deleteQuestion(index: number) {
    setQuestions((current) => current.filter((_, i) => i !== index));
  }

  function updateOptionLabel(questionIndex: number, optionId: string, label: string) {
    setQuestions((current) =>
      current.map((q, qIdx) => {
        if (qIdx !== questionIndex || !q.options) return q;
        const updatedOptions = q.options.map((opt) => (opt.id === optionId ? { ...opt, label } : opt));
        return { ...q, options: updatedOptions };
      })
    );
  }

  async function handleSave(publish: boolean) {
    if (!title.trim()) {
      setMessage('Please enter an exam title.');
      return;
    }

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

      setMessage(publish ? '🚀 Exam published! Students have been notified via email and portal.' : '💾 Exam saved as draft.');
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
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-medium text-slate-800">PDF / Image to Exam (Gemini AI)</h2>
      <p className="mt-1 text-sm text-slate-500">
        Upload course materials. Gemini reads text and visuals to generate structured questions.
      </p>

      {/* AI Customization Controls */}
      <div className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Questions Count</label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            <option value={3}>3 Questions</option>
            <option value={5}>5 Questions</option>
            <option value={8}>8 Questions</option>
            <option value={10}>10 Questions</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Target Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard' | 'mixed')}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            <option value="mixed">Mixed (Recommended)</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Topic Focus (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Chapter 2: Security"
            value={topicFocus}
            onChange={(e) => setTopicFocus(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          />
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-violet-400 hover:bg-violet-50">
        <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
        <span className="text-lg font-medium text-slate-700">{loading ? '⚡ Gemini is analyzing document & generating questions...' : '📤 Upload PDF or Image'}</span>
        <span className="mt-2 text-sm text-slate-500">{fileName || 'Supports PDF, PNG, JPEG, WebP (Max 4MB)'}</span>
      </label>

      {questions.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-lg font-medium text-slate-800">Exam Details</h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Exam Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Description / Instructions</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-800">Interactive Question Editor ({questions.length})</h3>
              <p className="text-xs text-slate-500">Click text fields to edit prompts or options directly</p>
            </div>

            {questions.map((question, index) => (
              <div key={index} className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-violet-600">Q{index + 1}</span>
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs text-violet-700 capitalize">{question.question_type}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 capitalize">{question.difficulty}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteQuestion(index)}
                    className="text-xs text-red-600 hover:text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <textarea
                  value={question.prompt}
                  onChange={(e) => updateQuestion(index, 'prompt', e.target.value)}
                  className="min-h-16 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                />

                {question.options && question.options.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-600">Options (Select correct answer):</p>
                    {question.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`correct-${index}`}
                          checked={question.correct_answer === opt.id}
                          onChange={() => updateQuestion(index, 'correct_answer', opt.id)}
                          className="h-4 w-4 text-violet-600"
                        />
                        <span className="font-mono text-xs text-slate-500 uppercase">{opt.id}.</span>
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => updateOptionLabel(index, opt.id, e.target.value)}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={loading}
              className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-700 disabled:opacity-70"
            >
              Publish & Notify Students
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-4 rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-700">{message}</p>}
    </div>
  );
}

