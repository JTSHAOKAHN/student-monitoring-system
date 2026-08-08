'use client';

import type { TimelineEntry } from '@/lib/types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function eventIcon(type: string) {
  if (type.includes('tab') || type.includes('blur')) return '⚠️';
  if (type.includes('copy') || type.includes('paste')) return '🚫';
  if (type.includes('question')) return '📝';
  if (type.includes('submitted') || type.includes('started')) return '✓';
  if (type.includes('idle')) return '💤';
  return '•';
}

export default function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <h3 className="text-lg font-semibold">Activity timeline</h3>
        <p className="mt-2 text-sm text-slate-400">No monitoring events recorded for this session.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
      <h3 className="text-lg font-semibold">Student activity timeline</h3>
      <p className="mt-1 text-sm text-slate-400">Chronological view of everything that happened during the exam session.</p>

      <ol className="relative mt-6 space-y-0 border-l border-white/10 pl-6">
        {entries.map((entry, index) => (
          <li key={`${entry.timestamp}-${index}`} className="relative pb-6 last:pb-0">
            <span className="absolute -left-[1.65rem] flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-slate-950 text-xs">
              {eventIcon(entry.event_type)}
            </span>
            <p className="font-mono text-xs text-cyan-400">{formatTime(entry.timestamp)}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-200">{entry.label}</p>
            {entry.details && Object.keys(entry.details).length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {Object.entries(entry.details)
                  .filter(([k]) => k !== 'questionIndex')
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(' · ')}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
