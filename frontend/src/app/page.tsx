import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col justify-between bg-slate-50 text-slate-800">
      {/* Top Header Navigation with Subtle Top-Right Admin Link */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-xs">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-violet-600" />
            <span className="text-xl font-normal text-slate-800">ExamGuardian</span>
          </div>
          <Link
            href="/admin/login"
            className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Main Centered Content Card Area */}
      <section className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
          {/* Google Forms Top Accent Ribbon */}
          <div className="h-3 bg-violet-600" />
          <div className="p-8 text-center sm:p-10">
            <span className="rounded-full bg-violet-100 px-3.5 py-1 text-xs font-semibold text-violet-700">
              Institutional Examination Portal
            </span>

            <h1 className="mt-4 text-3xl font-normal text-slate-800 sm:text-4xl">
              Student Examination System
            </h1>

            <p className="mt-4 text-sm text-slate-600">
              Welcome to the secure assessment platform. Please select your role to proceed to your examination dashboard.
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                href="/student/login"
                className="w-full max-w-md rounded-lg bg-violet-600 px-8 py-4 text-center text-lg font-medium text-white shadow-md transition hover:bg-violet-700 active:scale-[0.99]"
              >
                STUDENT
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Subtle Bottom-Right Teacher Login Link */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between text-xs text-slate-500">
          <span>ExamGuardian Assessment Infrastructure</span>
          <Link
            href="/auth?role=teacher"
            className="font-medium text-slate-400 transition hover:text-slate-700 hover:underline"
          >
            Teacher Login
          </Link>
        </div>
      </footer>
    </main>
  );
}

