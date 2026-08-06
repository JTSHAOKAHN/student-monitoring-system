import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-20 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-white/5 px-6 py-3 backdrop-blur">
          <div className="text-lg font-semibold">ExamGuardian</div>
          <div className="flex gap-3 text-sm text-slate-300">
            <Link href="/auth" className="rounded-full border border-white/10 px-4 py-2 transition hover:bg-white/10">
              Sign in
            </Link>
            <Link href="/teacher" className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-400">
              Teacher Dashboard
            </Link>
          </div>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
              AI-powered examination monitoring for modern education
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              Secure exams, smart monitoring, and actionable insight.
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              ExamGuardian helps schools create intelligent assessments, monitor student behavior in real time, and generate reports that support academic integrity.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/teacher" className="rounded-full bg-white px-5 py-3 font-medium text-slate-950 transition hover:bg-slate-200">
                Explore Teacher Tools
              </Link>
              <Link href="/student" className="rounded-full border border-white/15 px-5 py-3 font-medium text-white transition hover:bg-white/10">
                View Student Experience
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-linear-to-br from-cyan-500/20 via-slate-900 to-violet-500/20 p-8 shadow-2xl shadow-cyan-500/10">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5">
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Live exam overview</p>
                <div className="mt-3 space-y-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <span>Active sessions</span>
                    <span className="font-semibold text-white">24</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <span>Flagged students</span>
                    <span className="font-semibold text-white">3</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <span>Reports generated</span>
                    <span className="font-semibold text-white">12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
