-- Focus Mode is a paid/entitled feature. This policy is intentionally enforced
-- in the database as well as the app so direct client queries cannot bypass it.

alter table public.profiles
  add column if not exists role text default 'student',
  add column if not exists plan text default 'free',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists pro_expires_at timestamptz,
  add column if not exists subscription_status text default 'none';

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  duration_seconds integer not null check (duration_seconds between 2 and 86400),
  mode text not null check (mode in ('study', 'break')),
  completed boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.has_active_focus_entitlement(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and auth.uid() = target_user_id
    and exists (
      select 1
      from public.profiles profile
      where profile.id = target_user_id
        and (
          profile.role in ('admin', 'super_admin')
          or profile.plan = 'founding'
          or (profile.trial_ends_at is not null and profile.trial_ends_at > now())
          or (
            profile.plan = 'pro'
            and coalesce(profile.subscription_status, 'none') <> 'expired'
            and (profile.pro_expires_at is null or profile.pro_expires_at > now())
          )
        )
    );
$$;

grant execute on function public.has_active_focus_entitlement(uuid) to authenticated;

alter table public.focus_sessions enable row level security;

drop policy if exists "Users can manage their own focus sessions" on public.focus_sessions;
drop policy if exists "Entitled users can read focus sessions" on public.focus_sessions;
drop policy if exists "Entitled users can create focus sessions" on public.focus_sessions;
drop policy if exists "Entitled users can update focus sessions" on public.focus_sessions;
drop policy if exists "Entitled users can delete focus sessions" on public.focus_sessions;

create policy "Entitled users can read focus sessions"
  on public.focus_sessions for select
  using (auth.uid() = user_id and public.has_active_focus_entitlement(user_id));

create policy "Entitled users can create focus sessions"
  on public.focus_sessions for insert
  with check (auth.uid() = user_id and public.has_active_focus_entitlement(user_id));

create policy "Entitled users can update focus sessions"
  on public.focus_sessions for update
  using (auth.uid() = user_id and public.has_active_focus_entitlement(user_id))
  with check (auth.uid() = user_id and public.has_active_focus_entitlement(user_id));

create policy "Entitled users can delete focus sessions"
  on public.focus_sessions for delete
  using (auth.uid() = user_id and public.has_active_focus_entitlement(user_id));

-- created_at can collide during rapid inserts; id provides a stable final order.
do $$
begin
  if to_regclass('public.ai_chat_messages') is not null then
    execute 'create index if not exists ai_chat_messages_session_created_id_idx on public.ai_chat_messages (session_id, created_at, id)';
  end if;
end;
$$;

create index if not exists focus_sessions_user_created_id_idx
  on public.focus_sessions (user_id, created_at desc, id desc);
