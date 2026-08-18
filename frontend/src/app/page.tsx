import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col justify-between bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-xs">
        <div className="mx-auto flex max-w-4xl items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-violet-600" />
            <span className="text-xl font-normal text-slate-800">ExamGuardian</span>
          </div>
        </div>
      </header>

      {/* Main Content - Portal Selection */}
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-12">
        <div className="text-center mb-10">
          <span className="rounded-full bg-violet-100 px-3.5 py-1 text-xs font-semibold text-violet-700">
            Institutional Examination Portal
          </span>
          <h1 className="mt-4 text-3xl font-normal text-slate-800 sm:text-4xl">
            Select Your Portal
          </h1>
          <p className="mt-4 text-sm text-slate-600">
            Choose your role to access the appropriate examination dashboard
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Student Portal Card */}
          <Link href="/student/login" className="group">
            <div className="flex h-full flex-col items-center rounded-xl border-2 border-slate-200 bg-white p-6 text-center transition-all hover:border-violet-400 hover:shadow-lg">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl group-hover:bg-violet-200 transition">
                👨‍🎓
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Student Portal</h2>
              <p className="mt-2 text-sm text-slate-600">Take exams, view results, and track progress</p>
              <div className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white group-hover:bg-violet-700 transition">
                Enter Portal
              </div>
            </div>
          </Link>

          {/* Teacher Portal Card */}
          <Link href="/auth?role=teacher" className="group">
            <div className="flex h-full flex-col items-center rounded-xl border-2 border-slate-200 bg-white p-6 text-center transition-all hover:border-blue-400 hover:shadow-lg">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl group-hover:bg-blue-200 transition">
                👨‍🏫
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Teacher Portal</h2>
              <p className="mt-2 text-sm text-slate-600">Create exams, monitor students, and review results</p>
              <div className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white group-hover:bg-blue-700 transition">
                Enter Portal
              </div>
            </div>
          </Link>

          {/* Admin Portal Card */}
          <Link href="/admin/login" className="group">
            <div className="flex h-full flex-col items-center rounded-xl border-2 border-slate-200 bg-white p-6 text-center transition-all hover:border-emerald-400 hover:shadow-lg">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl group-hover:bg-emerald-200 transition">
                👨‍💼
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Admin Portal</h2>
              <p className="mt-2 text-sm text-slate-600">Manage users, configure system, and oversee operations</p>
              <div className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white group-hover:bg-emerald-700 transition">
                Enter Portal
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-center text-xs text-slate-500">
          <span>ExamGuardian Assessment Infrastructure</span>
        </div>
      </footer>
    </main>
  );
}

