'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamMonitoring } from '@/hooks/useExamMonitoring';

interface Question {
  id: string;
  prompt: string;
  question_type: string;
  options?: Array<{ id: string; label: string }> | null;
  order_index: number;
}

interface ExamData {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
}

export default function GoogleFormsExam({ examId }: { examId: string }) {
  const router = useRouter();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const { track, flush } = useExamMonitoring({
    sessionId,
    enabled: started && !!sessionId,
    questionIndex: currentIndex,
  });

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/student/exams/${examId}`);
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || 'Unable to load exam');
        setLoading(false);
        return;
      }
      setExam(data.exam);
      setQuestions(data.questions || []);
      if (data.attempt?.status === 'submitted') {
        setMessage('You have already submitted this exam.');
      }
      setLoading(false);
    }
    void load();
  }, [examId]);

  useEffect(() => {
    if (started) {
      track('question_viewed', { questionIndex: currentIndex });
    }
  }, [currentIndex, started, track]);

  async function handleStart() {
    setLoading(true);
    const response = await fetch('/api/student/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Unable to start exam');
      setLoading(false);
      return;
    }
    setAttemptId(data.attemptId);
    setSessionId(data.sessionId);
    setStarted(true);
    setLoading(false);
  }

  const handleResponseChange = useCallback(
    (questionId: string, value: string) => {
      setResponses((prev) => ({ ...prev, [questionId]: value }));
      track('question_answered', { questionId, questionIndex: currentIndex });
    },
    [currentIndex, track]
  );

  async function handleSubmit() {
    if (!attemptId) {
      return;
    }
    setSubmitting(true);
    await flush();
    const payload = Object.entries(responses).map(([questionId, response]) => ({ questionId, response }));
    const response = await fetch(`/api/student/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses: payload }),
    });
    const data = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setMessage(data.error || 'Submit failed');
      return;
    }
    router.push('/student?submitted=1');
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">Loading exam...</div>;
  }

  if (!exam) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-red-600">{message || 'Exam not found'}</div>;
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-slate-100 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="h-2 bg-violet-600" />
            <div className="p-8">
              <h1 className="text-3xl font-normal text-slate-800">{exam.title}</h1>
              <p className="mt-4 text-slate-600">{exam.description}</p>
              <ul className="mt-6 space-y-2 text-sm text-slate-500">
                <li>• {questions.length} questions</li>
                <li>• Time limit: {exam.duration_minutes} minutes</li>
                <li>• Do not switch tabs or copy/paste during the exam</li>
                <li>• Your activity will be monitored for academic integrity</li>
              </ul>
              {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
              {!message?.includes('already submitted') && (
                <button
                  type="button"
                  onClick={handleStart}
                  className="mt-8 rounded-md bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
                >
                  Start exam
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-100 py-6">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-slate-200">
            <div className="h-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="border-b border-violet-100 bg-violet-50 px-6 py-4">
            <p className="text-xs text-violet-700">ExamGuardian • Question {currentIndex + 1} of {questions.length}</p>
            <h1 className="text-lg font-medium text-slate-800">{exam.title}</h1>
          </div>
        </div>

        {question && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-base text-slate-800">
              {question.prompt}
              <span className="ml-1 text-red-500">*</span>
            </p>

            <div className="mt-6 space-y-3">
              {question.question_type === 'multiple_choice' && question.options ? (
                question.options.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                      responses[question.id] === option.id
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option.id}
                      checked={responses[question.id] === option.id}
                      onChange={() => handleResponseChange(question.id, option.id)}
                      className="h-4 w-4 text-violet-600"
                    />
                    <span className="text-sm text-slate-700">{option.label}</span>
                  </label>
                ))
              ) : question.question_type === 'true_false' ? (
                ['True', 'False'].map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                      responses[question.id] === option ? 'border-violet-500 bg-violet-50' : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={responses[question.id] === option}
                      onChange={() => handleResponseChange(question.id, option)}
                      className="h-4 w-4 text-violet-600"
                    />
                    <span className="text-sm text-slate-700">{option}</span>
                  </label>
                ))
              ) : (
                <textarea
                  value={responses[question.id] || ''}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                  className="min-h-28 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  placeholder="Your answer"
                />
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-40"
          >
            Previous
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="rounded-md bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-md bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
