'use client';

export default function CheatingRiskPanel({
  risk,
  focusScore,
  flaggedEvents,
}: {
  risk: number;
  focusScore: number;
  flaggedEvents: number;
}) {
  const level = risk >= 60 ? 'High' : risk >= 30 ? 'Medium' : 'Low';
  const color = risk >= 60 ? 'text-red-400 border-red-500/30 bg-red-500/10' : risk >= 30 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className={`rounded-2xl border p-5 ${color}`}>
        <p className="text-sm opacity-80">Cheating risk</p>
        <p className="mt-2 text-4xl font-bold">{risk}%</p>
        <p className="mt-1 text-sm">{level} risk level</p>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <p className="text-sm text-emerald-300/80">Focus score</p>
        <p className="mt-2 text-4xl font-bold text-emerald-300">{focusScore}%</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-950">
          <div className="h-full bg-emerald-400 transition-all" style={{ width: `${focusScore}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
        <p className="text-sm text-slate-400">Flagged events</p>
        <p className="mt-2 text-4xl font-bold text-white">{flaggedEvents}</p>
        <p className="mt-1 text-sm text-slate-500">Tab switches, copy/paste, etc.</p>
      </div>
    </div>
  );
}
