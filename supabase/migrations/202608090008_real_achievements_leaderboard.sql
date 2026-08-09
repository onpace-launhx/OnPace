-- Real, opt-in community leaderboard. No seeded or demo students are used.
alter table public.profiles
  add column if not exists leaderboard_opt_in boolean not null default false,
  add column if not exists leaderboard_display_name text;

alter table public.profiles
  drop constraint if exists profiles_leaderboard_display_name_length;
alter table public.profiles
  add constraint profiles_leaderboard_display_name_length
  check (leaderboard_display_name is null or char_length(trim(leaderboard_display_name)) between 2 and 40);

create or replace function public.set_my_leaderboard_profile(
  p_opt_in boolean,
  p_display_name text default null
)
returns table (leaderboard_opt_in boolean, leaderboard_display_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_name text := nullif(trim(coalesce(p_display_name, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if safe_name is not null and char_length(safe_name) not between 2 and 40 then
    raise exception 'Display name must be between 2 and 40 characters';
  end if;

  update public.profiles
  set leaderboard_opt_in = coalesce(p_opt_in, false),
      leaderboard_display_name = safe_name
  where id = auth.uid();

  return query
  select profile.leaderboard_opt_in, profile.leaderboard_display_name
  from public.profiles profile
  where profile.id = auth.uid();
end;
$$;

create or replace function public.get_weekly_study_leaderboard()
returns table (
  user_id uuid,
  display_name text,
  focus_minutes integer,
  completed_tasks integer,
  streak_days integer,
  score integer
)
language sql
stable
security definer
set search_path = public
as $$
  with current_week as (
    select date_trunc('week', timezone('utc', now())) as starts_at
  ), focus as (
    select session.user_id,
      floor(sum(session.duration_seconds) / 60.0)::integer as focus_minutes
    from public.focus_sessions session, current_week
    where session.mode = 'study'
      and session.completed = true
      and session.created_at >= current_week.starts_at
    group by session.user_id
  ), completed as (
    select task.user_id, count(*)::integer as completed_tasks
    from public.tasks task, current_week
    where task.status = 'completed'
      and coalesce(
        nullif(to_jsonb(task)->>'completed_at', '')::timestamptz,
        nullif(to_jsonb(task)->>'updated_at', '')::timestamptz,
        nullif(to_jsonb(task)->>'created_at', '')::timestamptz
      ) >= current_week.starts_at
    group by task.user_id
  )
  select
    profile.id,
    coalesce(nullif(trim(profile.leaderboard_display_name), ''), 'OnPace student') as display_name,
    coalesce(focus.focus_minutes, 0) as focus_minutes,
    coalesce(completed.completed_tasks, 0) as completed_tasks,
    coalesce(nullif(to_jsonb(profile)->>'streak_count', '')::integer, 0) as streak_days,
    (coalesce(focus.focus_minutes, 0) + coalesce(completed.completed_tasks, 0) * 25 + coalesce(nullif(to_jsonb(profile)->>'streak_count', '')::integer, 0) * 10)::integer as score
  from public.profiles profile
  left join focus on focus.user_id = profile.id
  left join completed on completed.user_id = profile.id
  where profile.leaderboard_opt_in = true
    and (coalesce(focus.focus_minutes, 0) > 0 or coalesce(completed.completed_tasks, 0) > 0)
  order by score desc, focus_minutes desc, completed_tasks desc, display_name asc
  limit 100;
$$;

revoke all on function public.set_my_leaderboard_profile(boolean, text) from public, anon;
grant execute on function public.set_my_leaderboard_profile(boolean, text) to authenticated, service_role;
revoke all on function public.get_weekly_study_leaderboard() from public, anon;
grant execute on function public.get_weekly_study_leaderboard() to authenticated, service_role;

notify pgrst, 'reload schema';
