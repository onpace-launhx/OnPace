-- One in-app daily briefing per student and local calendar day.

create table if not exists public.daily_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  briefing_date date not null,
  notification_id uuid references public.notifications(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

create index if not exists idx_daily_briefings_user_date
  on public.daily_briefings (user_id, briefing_date desc);

alter table public.daily_briefings enable row level security;

drop policy if exists "daily_briefings_select_own" on public.daily_briefings;
create policy "daily_briefings_select_own"
on public.daily_briefings for select
using (auth.uid() = user_id);

drop policy if exists "daily_briefings_insert_own" on public.daily_briefings;
create policy "daily_briefings_insert_own"
on public.daily_briefings for insert
with check (auth.uid() = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own"
on public.notifications for insert
with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
