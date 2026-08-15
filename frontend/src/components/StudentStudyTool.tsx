'use client';

import { useState } from 'react';
import type { GeneratedQuestion } from '@/lib/types';

interface StudyFocusArea {
  topic: string;
  reason: string;
  suggestedStudyTime: string;
}

export default function StudentStudyTool() {
  const [fileName, setFileName] = useState('');
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [studyFocusAreas, setStudyFocusAreas] = useState<StudyFocusArea[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Study Controls
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [topicFocus, setTopicFocus] = useState('');

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    if (file.size > MAX_FILE_SIZE) {
      setMessage(`File exceeds 50MB limit. File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setMessage('Only PDF files are allowed.');
      return;
    }

    if (file.type !== 'application/pdf') {
      setMessage('Invalid file type. Only PDF files are allowed.');
      return;
    }

    setFileName(file.name);
    setLoading(true);
    setMessage(null);
    setUploadProgress(0);
    setShowAnswers(false);
    setUserAnswers({});

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('count', String(count));
      formData.append('difficulty', difficulty);
      formData.append('topicFocus', topicFocus);
      formData.append('userType', 'student');
      formData.append('useRandomSeed', 'true'); // Ensure different questions each time

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/pdf-exam', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to generate practice questions.');
      }

      setQuestions(result.questions || []);
      setStudyFocusAreas(result.studyFocusAreas || []);
      setMessage('✨ Practice questions generated! Answer the questions first, then reveal answers and study focus areas.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to process the uploaded file.');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerChange(questionIndex: number, answer: string) {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  }

  function checkAnswers() {
    let correct = 0;
    questions.forEach((q, index) => {
      const userAnswer = userAnswers[index];
      if (userAnswer && userAnswer.toLowerCase() === q.correct_answer.toLowerCase()) {
        correct++;
      }
    });
    
    const percentage = Math.round((correct / questions.length) * 100);
    setMessage(`📊 You got ${correct}/${questions.length} correct (${percentage}%). ${percentage >= 70 ? 'Great job!' : 'Keep practicing!'}`);
    setShowAnswers(true);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-medium text-slate-800">Study Tool (Gemini AI)</h2>
      <p className="mt-1 text-sm text-slate-500">
        Upload course materials to generate practice questions with explanations and personalized study focus areas.
      </p>

      {/* Study Customization Controls */}
      <div className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Questions Count</label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            <option value={5}>5 Questions</option>
            <option value={10}>10 Questions</option>
            <option value={15}>15 Questions</option>
            <option value={20}>20 Questions</option>
            <option value={30}>30 Questions</option>
            <option value={50}>50 Questions</option>
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
        <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
        <span className="text-lg font-medium text-slate-700">{loading ? '⚡ Processing PDF and generating practice questions...' : '📤 Upload PDF for Study'}</span>
        <span className="mt-2 text-sm text-slate-500">{fileName || 'Supports PDF (Max 50MB)'}</span>
        
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mt-4 w-full">
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div 
                className="h-2 rounded-full bg-violet-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="mt-1 text-xs text-slate-500">Processing... {uploadProgress}%</span>
          </div>
        )}
      </label>

      {questions.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-800">Practice Questions ({questions.length})</h3>
            {!showAnswers && (
              <button
                onClick={checkAnswers}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Check Answers
              </button>
            )}
          </div>

          {questions.map((question, index) => (
            <div key={index} className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-violet-600">Q{index + 1}</span>
                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs text-violet-700 capitalize">{question.question_type}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 capitalize">{question.difficulty}</span>
              </div>

              <div className="text-sm text-slate-800">{question.prompt}</div>

              {question.options && question.options.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">Select your answer:</p>
                  {question.options.map((opt) => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`question-${index}`}
                        disabled={showAnswers}
                        checked={userAnswers[index] === opt.id}
                        onChange={() => handleAnswerChange(index, opt.id)}
                        className="h-4 w-4 text-violet-600"
                      />
                      <span className="font-mono text-xs text-slate-500 uppercase">{opt.id}.</span>
                      <span className="text-sm text-slate-800">{opt.label}</span>
                      {showAnswers && (
                        <span className={`ml-2 text-xs ${question.correct_answer === opt.id ? 'text-green-600 font-medium' : 'text-red-600'}`}>
                          {question.correct_answer === opt.id ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {question.question_type === 'short_answer' && (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">Your answer:</p>
                  <input
                    type="text"
                    disabled={showAnswers}
                    value={userAnswers[index] || ''}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                    placeholder="Type your answer here..."
                  />
                  {showAnswers && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-slate-700">Correct answer: </span>
                      <span className="text-green-600">{question.correct_answer}</span>
                    </div>
                  )}
                </div>
              )}

              {showAnswers && question.explanation && (
                <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-xs font-medium text-blue-800">Explanation:</p>
                  <p className="text-xs text-blue-700 mt-1">{question.explanation}</p>
                </div>
              )}
            </div>
          ))}

          {studyFocusAreas.length > 0 && showAnswers && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <h4 className="text-lg font-medium text-amber-800 mb-3">📚 Study Focus Areas</h4>
              <p className="text-sm text-amber-700 mb-4">Based on your performance and the content, focus on these areas:</p>
              <div className="space-y-3">
                {studyFocusAreas.map((area, index) => (
                  <div key={index} className="rounded-lg bg-white border border-amber-200 p-4">
                    <div className="flex items-start justify-between">
                      <h5 className="font-medium text-amber-900">{area.topic}</h5>
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">{area.suggestedStudyTime}</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-2">{area.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              onClick={() => {
                setQuestions([]);
                setFileName('');
                setShowAnswers(false);
                setUserAnswers({});
                setStudyFocusAreas([]);
              }}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Try Another PDF
            </button>
            {showAnswers && (
              <button
                onClick={() => setShowAnswers(false)}
                className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-700"
              >
                Hide Answers & Try Again
              </button>
            )}
          </div>
        </div>
      )}

      {message && <p className="mt-4 rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-700">{message}</p>}
    </div>
  );
}