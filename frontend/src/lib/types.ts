export type UserRole = 'teacher' | 'student' | 'admin';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank';

export type AttemptStatus = 'in_progress' | 'submitted' | 'abandoned';

export type MonitoringEventType =
  | 'exam_started'
  | 'exam_submitted'
  | 'tab_switch'
  | 'window_blur'
  | 'window_focus'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'right_click'
  | 'fullscreen_exit'
  | 'window_resize'
  | 'refresh_attempt'
  | 'idle'
  | 'question_viewed'
  | 'question_answered'
  | 'keyboard_shortcut'
  | 'mouse_click'
  | 'internet_disconnect';

export type NotificationType =
  | 'exam_started'
  | 'exam_finished'
  | 'student_flagged'
  | 'report_generated'
  | 'weekly_stats'
  | 'exam_published'
  | 'general';

export interface QuestionOption {
  id: string;
  label: string;
}

export interface GeneratedQuestion {
  prompt: string;
  question_type: QuestionType;
  options?: QuestionOption[];
  correct_answer?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export interface MonitoringEventPayload {
  event_type: MonitoringEventType;
  details?: Record<string, unknown>;
  created_at?: string;
}

export interface TimelineEntry {
  timestamp: string;
  event_type: string;
  label: string;
  details?: Record<string, unknown>;
}

export interface HeatmapCell {
  questionIndex: number;
  seconds: number;
  revisits: number;
}

export interface ExamAnalytics {
  focusScore: number;
  cheatingRisk: number;
  completionRate: number;
  avgTimeSeconds: number;
  heatmap: HeatmapCell[];
  flaggedEvents: number;
}

export interface StudentExamSummary {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  question_count: number;
  attempt_status?: AttemptStatus | null;
  attempt_id?: string | null;
}
