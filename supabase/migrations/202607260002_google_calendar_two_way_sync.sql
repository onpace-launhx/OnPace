-- Persistent two-way synchronization between OnPace study sessions and Google Calendar.

alter table public.study_sessions
  add column if not exists duration integer not null default 60,
  add column if not exists google_event_id text,
  add column if not exists google_calendar_id text not null default 'primary',
  add column if not exists google_etag text,
  add column if not exists google_updated_at timestamptz,
  add column if not exists sync_origin text not null default 'onpace',
  add column if not exists sync_status text not null default 'local_only',
  add column if not exists last_synced_at timestamptz,
  add column if not exists sync_error text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.study_sessions
  drop constraint if exists study_sessions_duration_check;
alter table public.study_sessions
  add constraint study_sessions_duration_check
  check (duration between 1 and 1440);

alter table public.study_sessions
  drop constraint if exists study_sessions_sync_origin_check;
alter table public.study_sessions
  add constraint study_sessions_sync_origin_check
  check (sync_origin in ('onpace', 'google'));

alter table public.study_sessions
  drop constraint if exists study_sessions_sync_status_check;
alter table public.study_sessions
  add constraint study_sessions_sync_status_check
  check (sync_status in ('local_only', 'pending_update', 'synced', 'error'));

create unique index if not exists idx_study_sessions_google_event
  on public.study_sessions(user_id, google_calendar_id, google_event_id)
  where google_event_id is not null;

create index if not exists idx_study_sessions_sync_pending
  on public.study_sessions(user_id, sync_status, updated_at);

create or replace function public.touch_study_session_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_study_sessions_updated_at on public.study_sessions;
create trigger trg_study_sessions_updated_at
before update on public.study_sessions
for each row execute function public.touch_study_session_updated_at();

create table if not exists public.calendar_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calendar_id text not null default 'primary',
  next_sync_token text,
  last_full_sync_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_sync_state enable row level security;

drop policy if exists "calendar_sync_state_all_own" on public.calendar_sync_state;
create policy "calendar_sync_state_all_own"
on public.calendar_sync_state
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.calendar_sync_tombstones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id text not null default 'primary',
  google_event_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, calendar_id, google_event_id)
);

alter table public.calendar_sync_tombstones enable row level security;

drop policy if exists "calendar_sync_tombstones_all_own" on public.calendar_sync_tombstones;
create policy "calendar_sync_tombstones_all_own"
on public.calendar_sync_tombstones
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

notify pgrst, 'reload schema';
