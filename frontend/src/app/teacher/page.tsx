import ExamCreationForm from '@/components/ExamCreationForm';

export default function TeacherDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Teacher dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold">Upload PDFs, generate exams, and review analytics</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            This module powers exam creation, student insights, reporting, and teacher operations.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: 'Upload PDF', description: 'Import classroom materials and start exam generation.' },
            { title: 'Generate Exam', description: 'Create assessments from uploaded content with AI support.' },
            { title: 'View Analytics', description: 'Track engagement, risk signals, and completion performance.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-2xl font-semibold">Create your first exam</h2>
          <p className="mt-2 text-slate-300">This form saves a new exam to Supabase for your teacher account.</p>
          <div className="mt-4">
            <ExamCreationForm />
          </div>
        </div>
      </div>
    </main>
  );
}
