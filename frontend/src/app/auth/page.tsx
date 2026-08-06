export default function AuthPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Authentication</p>
          <h1 className="mt-2 text-3xl font-semibold">Teacher, student, and admin access</h1>
          <p className="mt-3 text-slate-300">
            This module will provide secure role-based sign-in and onboarding for all users.
          </p>
        </div>
      </div>
    </main>
  );
}
