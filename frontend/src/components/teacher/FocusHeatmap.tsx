'use client';

import type { HeatmapCell } from '@/lib/types';

export default function FocusHeatmap({ data }: { data: HeatmapCell[] }) {
  if (!data.length) {
    return null;
  }

  const maxSeconds = Math.max(...data.map((c) => c.seconds), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
      <h3 className="text-lg font-semibold">Question time heatmap</h3>
      <p className="mt-1 text-sm text-slate-400">Darker cells indicate more time spent on a question.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {data.map((cell) => {
          const intensity = cell.seconds / maxSeconds;
          const bg = `rgba(6, 182, 212, ${0.15 + intensity * 0.85})`;

          return (
            <div
              key={cell.questionIndex}
              className="rounded-xl border border-white/10 p-3 text-center"
              style={{ backgroundColor: bg }}
            >
              <p className="text-xs text-slate-400">Q{cell.questionIndex + 1}</p>
              <p className="mt-1 text-lg font-semibold text-white">{cell.seconds}s</p>
              <p className="text-xs text-slate-400">{cell.revisits} visits</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
