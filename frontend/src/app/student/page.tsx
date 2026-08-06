export default function StudentDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Student dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold">Take exams, track progress, and submit confidently</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            This module will support available exams, exam flow, resumes, and submission completion.
          </p>
        </div>
      </div>
    </main>
  );
}
