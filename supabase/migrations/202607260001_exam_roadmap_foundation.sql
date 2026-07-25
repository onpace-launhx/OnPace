-- Exam roadmap foundation: every row is owned by one authenticated student.

create table if not exists public.exam_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 160),
  exam_date date not null,
  target_score text,
  color text not null default '#4F46E5',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_topics (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exam_roadmaps(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 180),
  importance smallint not null default 2 check (importance between 1 and 3),
  estimated_minutes integer not null default 60 check (estimated_minutes between 5 and 1440),
  mastery_status text not null default 'not_started'
    check (mastery_status in ('not_started', 'learning', 'review_needed', 'confident')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_plan_blocks (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exam_roadmaps(id) on delete cascade,
  topic_id uuid references public.exam_topics(id) on delete set null,
  scheduled_for date not null,
  planned_minutes integer not null check (planned_minutes between 5 and 480),
  title text not null,
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped')),
  created_at timestamptz not null default now()
);

create index if not exists idx_exam_roadmaps_user_date on public.exam_roadmaps(user_id, exam_date);
create index if not exists idx_exam_topics_exam on public.exam_topics(exam_id, created_at);
create index if not exists idx_exam_plan_blocks_exam_date on public.exam_plan_blocks(exam_id, scheduled_for);

alter table public.exam_roadmaps enable row level security;
alter table public.exam_topics enable row level security;
alter table public.exam_plan_blocks enable row level security;

drop policy if exists "exam_roadmaps_all_own" on public.exam_roadmaps;
create policy "exam_roadmaps_all_own" on public.exam_roadmaps
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "exam_topics_all_own" on public.exam_topics;
create policy "exam_topics_all_own" on public.exam_topics
  for all to authenticated
  using (exists (select 1 from public.exam_roadmaps e where e.id = exam_topics.exam_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.exam_roadmaps e where e.id = exam_topics.exam_id and e.user_id = auth.uid()));

drop policy if exists "exam_plan_blocks_all_own" on public.exam_plan_blocks;
create policy "exam_plan_blocks_all_own" on public.exam_plan_blocks
  for all to authenticated
  using (exists (select 1 from public.exam_roadmaps e where e.id = exam_plan_blocks.exam_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.exam_roadmaps e where e.id = exam_plan_blocks.exam_id and e.user_id = auth.uid()));
