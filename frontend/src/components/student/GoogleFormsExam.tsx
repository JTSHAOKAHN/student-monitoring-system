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
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [savedStatus, setSavedStatus] = useState<string>('Saved');
  const [isFullscreen, setIsFullscreen] = useState(true);

  const { track, flush } = useExamMonitoring({
    sessionId,
    enabled: started && !!sessionId,
    questionIndex: currentIndex,
  });

  // Load exam & restore local draft if available
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

      // Restore local draft responses
      const localDraft = localStorage.getItem(`exam_draft_${examId}`);
      if (localDraft) {
        try {
          const parsed = JSON.parse(localDraft);
          setResponses(parsed.responses || {});
          setMarkedForReview(parsed.markedForReview || {});
        } catch {
          // ignore invalid draft
        }
      }

      setLoading(false);
    }
    void load();
  }, [examId]);

  // Fullscreen monitor
  useEffect(() => {
    if (!started) return;
    const checkFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', checkFullscreen);
    return () => document.removeEventListener('fullscreenchange', checkFullscreen);
  }, [started]);

  const handleSubmit = useCallback(async () => {
    if (!attemptId || submitting) {
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
    localStorage.removeItem(`exam_draft_${examId}`);
    router.push('/student?submitted=1');
  }, [attemptId, submitting, flush, responses, examId, router]);

  // Countdown timer effect
  useEffect(() => {
    if (!started || !exam?.duration_minutes) return;

    if (timeLeft === null) {
      setTimeLeft(exam.duration_minutes * 60);
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          void handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, exam?.duration_minutes, timeLeft, handleSubmit]);

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

    // Request fullscreen
    if (document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  const handleResponseChange = useCallback(
    (questionId: string, value: string) => {
      setResponses((prev) => {
        const next = { ...prev, [questionId]: value };
        localStorage.setItem(`exam_draft_${examId}`, JSON.stringify({ responses: next, markedForReview }));
        return next;
      });
      setSavedStatus('Draft auto-saved');
      track('question_answered', { questionId, questionIndex: currentIndex });
    },
    [currentIndex, track, examId, markedForReview]
  );

  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview((prev) => {
      const next = { ...prev, [questionId]: !prev[questionId] };
      localStorage.setItem(`exam_draft_${examId}`, JSON.stringify({ responses, markedForReview: next }));
      return next;
    });
  };

  const formatTimer = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">Loading exam...</div>;
  }

  if (!exam) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-red-600">{message || 'Exam not found'}</div>;
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-slate-100 py-10">
        <div className="mx-auto max-w-2xl px-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
            <div className="h-3 bg-violet-600" />
            <div className="p-8">
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">Google Forms Style Exam</span>
              <h1 className="mt-3 text-3xl font-normal text-slate-800">{exam.title}</h1>
              <p className="mt-4 text-slate-600">{exam.description}</p>

              <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Exam Instructions</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  <li>• Total Questions: <strong>{questions.length}</strong></li>
                  <li>• Time Limit: <strong>{exam.duration_minutes} minutes</strong> (Auto-submits at 00:00)</li>
                  <li>• Do not switch tabs, copy/paste, or exit fullscreen during the session.</li>
                  <li>• Your focus score & activity timeline will be monitored.</li>
                </ul>
              </div>

              {message && <p className="mt-4 text-sm font-medium text-red-600">{message}</p>}

              {!message?.includes('already submitted') && (
                <button
                  type="button"
                  onClick={handleStart}
                  className="mt-8 rounded-lg bg-violet-600 px-8 py-3 text-sm font-medium text-white shadow hover:bg-violet-700"
                >
                  Start Exam
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
  const timerWarning = timeLeft !== null && timeLeft <= 300;

  return (
    <div className="min-h-screen bg-slate-100 py-6">
      {!isFullscreen && (
        <div className="sticky top-0 z-50 flex items-center justify-between bg-amber-500 px-6 py-3 text-xs font-semibold text-slate-950 shadow-md">
          <span>⚠️ Warning: Fullscreen mode exited! Click to restore fullscreen to avoid proctor flag.</span>
          <button
            type="button"
            onClick={() => document.documentElement.requestFullscreen().catch(() => {})}
            className="rounded-md bg-slate-950 px-3 py-1 text-white hover:bg-slate-800"
          >
            Enter Fullscreen
          </button>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4">
        {/* Google Forms Header Card */}
        <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="h-2 bg-violet-600" />
          <div className="h-1 bg-slate-200">
            <div className="h-full bg-violet-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-medium text-slate-500">{exam.title} • {questions.length} Questions</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{savedStatus}</span>
                <span
                  className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${
                    timerWarning ? 'animate-pulse bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  ⏱️ {formatTimer(timeLeft)}
                </span>
              </div>
            </div>

            {/* Question Navigation Palette */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-500">Question Palette (Click to jump):</p>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = !!responses[q.id];
                  const isMarked = !!markedForReview[q.id];
                  const isCurrent = idx === currentIndex;

                  let badgeBg = 'bg-slate-100 text-slate-600 border-slate-300';
                  if (isAnswered) badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-400';
                  if (isMarked) badgeBg = 'bg-amber-100 text-amber-800 border-amber-400';

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-8 w-8 rounded-lg border text-xs font-bold transition ${badgeBg} ${
                        isCurrent ? 'ring-2 ring-violet-600 ring-offset-1' : 'hover:opacity-80'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Question Card */}
        {question && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">Question {currentIndex + 1}</span>
              <button
                type="button"
                onClick={() => toggleMarkForReview(question.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium border transition ${
                  markedForReview[question.id]
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {markedForReview[question.id] ? '★ Marked for Review' : '☆ Mark for Review'}
              </button>
            </div>

            <p className="mt-4 text-base font-medium text-slate-800">
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
                      responses[question.id] === option ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
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
                  placeholder="Your answer..."
                />
              )}
            </div>
          </div>
        )}

        {/* Question Footer Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

