import type { ExamAnalytics, HeatmapCell, MonitoringEventPayload, TimelineEntry } from './types';

const EVENT_LABELS: Record<string, string> = {
  exam_started: 'Exam started',
  exam_submitted: 'Exam submitted',
  tab_switch: 'Switched tabs',
  window_blur: 'Left exam window',
  window_focus: 'Returned to exam',
  copy_attempt: 'Copy attempt detected',
  paste_attempt: 'Paste attempt detected',
  right_click: 'Right-click detected',
  fullscreen_exit: 'Exited fullscreen',
  window_resize: 'Window resized',
  refresh_attempt: 'Refresh attempt',
  idle: 'Idle period detected',
  question_viewed: 'Viewed question',
  question_answered: 'Answered question',
  keyboard_shortcut: 'Keyboard shortcut used',
  mouse_click: 'Mouse click',
  internet_disconnect: 'Internet disconnected',
};

const CHEATING_WEIGHTS: Record<string, number> = {
  tab_switch: 12,
  copy_attempt: 20,
  paste_attempt: 25,
  right_click: 5,
  fullscreen_exit: 8,
  refresh_attempt: 15,
  keyboard_shortcut: 6,
  window_blur: 4,
  idle: 2,
};

export function formatTimelineEntry(event: MonitoringEventPayload & { created_at: string }): TimelineEntry {
  const details = event.details || {};
  let label = EVENT_LABELS[event.event_type] || event.event_type;

  if (event.event_type === 'question_viewed' && details.questionIndex !== undefined) {
    label = `Viewed question ${Number(details.questionIndex) + 1}`;
  }
  if (event.event_type === 'question_answered' && details.questionIndex !== undefined) {
    label = `Answered question ${Number(details.questionIndex) + 1}`;
  }
  if (event.event_type === 'tab_switch' && details.durationSeconds) {
    label = `Switched tabs for ${details.durationSeconds}s`;
  }
  if (event.event_type === 'idle' && details.durationSeconds) {
    label = `Idle for ${details.durationSeconds}s`;
  }

  return {
    timestamp: event.created_at,
    event_type: event.event_type,
    label,
    details,
  };
}

export function buildHeatmap(
  events: Array<MonitoringEventPayload & { created_at: string }>,
  questionCount: number
): HeatmapCell[] {
  const cells: HeatmapCell[] = Array.from({ length: questionCount }, (_, i) => ({
    questionIndex: i,
    seconds: 0,
    revisits: 0,
  }));

  let currentQuestion = 0;
  let lastTimestamp = Date.now();

  for (const event of events) {
    const ts = new Date(event.created_at).getTime();
    const delta = Math.max(0, Math.round((ts - lastTimestamp) / 1000));
    if (cells[currentQuestion]) {
      cells[currentQuestion].seconds += Math.min(delta, 120);
    }

    if (event.event_type === 'question_viewed' && event.details?.questionIndex !== undefined) {
      const idx = Number(event.details.questionIndex);
      if (cells[idx]) {
        cells[idx].revisits += 1;
        currentQuestion = idx;
      }
    }

    lastTimestamp = ts;
  }

  return cells;
}

export function computeAnalytics(
  events: Array<MonitoringEventPayload & { created_at: string }>,
  questionCount: number,
  answeredCount: number,
  durationSeconds: number
): ExamAnalytics {
  const flaggedEvents = events.filter((e) =>
    ['tab_switch', 'copy_attempt', 'paste_attempt', 'refresh_attempt', 'fullscreen_exit'].includes(e.event_type)
  ).length;

  let cheatingRisk = 0;
  for (const event of events) {
    cheatingRisk += CHEATING_WEIGHTS[event.event_type] || 0;
  }
  cheatingRisk = Math.min(100, Math.round(cheatingRisk));

  const blurCount = events.filter((e) => e.event_type === 'window_blur').length;
  const idleEvents = events.filter((e) => e.event_type === 'idle');
  const idleSeconds = idleEvents.reduce((sum, e) => sum + Number(e.details?.durationSeconds || 0), 0);

  const focusPenalty = blurCount * 5 + idleSeconds * 0.1 + flaggedEvents * 8;
  const focusScore = Math.max(0, Math.min(100, Math.round(100 - focusPenalty)));

  const completionRate = questionCount > 0 ? Math.round((answeredCount / questionCount) * 100) : 0;
  const heatmap = buildHeatmap(events, questionCount);

  return {
    focusScore,
    cheatingRisk,
    completionRate,
    avgTimeSeconds: durationSeconds,
    heatmap,
    flaggedEvents,
  };
}
