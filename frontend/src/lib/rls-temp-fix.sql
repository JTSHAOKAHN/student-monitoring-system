-- Disable RLS for users table to allow signup
alter table public.users disable row level security;

-- Re-enable RLS for other tables
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.courses enable row level security;
alter table public.classes enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.attempts enable row level security;
alter table public.student_responses enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.monitoring_events enable row level security;
alter table public.analytics enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.pdf_uploads enable row level security;
alter table public.ai_generated_questions enable row level security;
alter table public.extracted_content enable row level security;
alter table public.question_bank enable row level security;
alter table public.exam_questions enable row level security;