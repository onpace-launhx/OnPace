-- Complete the profile, social, study-group, and private peer-matching
-- foundation used by the dashboard. The migration is intentionally
-- idempotent so it can repair environments created before these fields
-- were tracked in source control.

alter table public.profiles
  add column if not exists gender text not null default 'other',
  add column if not exists preferred_gender text not null default 'any',
  add column if not exists learning_styles text[] not null default '{}',
  add column if not exists matches_used_this_month integer not null default 0,
  add column if not exists match_timezone text,
  add column if not exists match_availability jsonb not null default '[]'::jsonb,
  add column if not exists match_goals text not null default '',
  add column if not exists match_subjects text[] not null default '{}',
  add column if not exists match_profile_completed boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_gender_check,
  drop constraint if exists profiles_preferred_gender_check,
  drop constraint if exists profiles_matches_used_check,
  add constraint profiles_gender_check
    check (gender in ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say')),
  add constraint profiles_preferred_gender_check
    check (preferred_gender in ('any', 'male', 'female', 'non_binary')),
  add constraint profiles_matches_used_check
    check (matches_used_this_month >= 0);

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  course_name text not null default 'General Study',
  created_by uuid not null references public.profiles(id) on delete cascade,
  member_count integer not null default 0 check (member_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists study_groups_name_unique_idx
  on public.study_groups (lower(trim(name)));

create table if not exists public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.peer_matches (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references public.profiles(id) on delete cascade,
  user_two_id uuid not null references public.profiles(id) on delete cascade,
  user_one_approved boolean not null default false,
  user_two_approved boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_one_id <> user_two_id)
);

create unique index if not exists peer_matches_pair_unique_idx
  on public.peer_matches (
    least(user_one_id, user_two_id),
    greatest(user_one_id, user_two_id)
  );

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 400),
  is_flagged boolean not null default false,
  created_at timestamptz not null default now()
);

-- Existing projects may already contain these tables with references to
-- auth.users. Point the public social relations at profiles so PostgREST can
-- safely resolve the nested profile fields used by the application.
alter table public.study_groups
  drop constraint if exists study_groups_created_by_fkey,
  add constraint study_groups_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete cascade;

alter table public.group_memberships
  drop constraint if exists group_memberships_user_id_fkey,
  add constraint group_memberships_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.peer_matches
  drop constraint if exists peer_matches_user_one_id_fkey,
  drop constraint if exists peer_matches_user_two_id_fkey,
  add constraint peer_matches_user_one_id_fkey
    foreign key (user_one_id) references public.profiles(id) on delete cascade,
  add constraint peer_matches_user_two_id_fkey
    foreign key (user_two_id) references public.profiles(id) on delete cascade;

alter table public.posts
  drop constraint if exists posts_user_id_fkey,
  add constraint posts_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

create index if not exists group_memberships_user_idx
  on public.group_memberships (user_id, joined_at desc);
create index if not exists peer_matches_user_one_idx
  on public.peer_matches (user_one_id, created_at desc);
create index if not exists peer_matches_user_two_idx
  on public.peer_matches (user_two_id, created_at desc);
create index if not exists posts_visible_created_idx
  on public.posts (is_flagged, created_at desc);

alter table public.study_groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.peer_matches enable row level security;
alter table public.posts enable row level security;

drop policy if exists "study_groups_read_authenticated" on public.study_groups;
create policy "study_groups_read_authenticated" on public.study_groups
  for select to authenticated using (true);

drop policy if exists "study_groups_create_own" on public.study_groups;
create policy "study_groups_create_own" on public.study_groups
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "study_groups_manage_created" on public.study_groups;
create policy "study_groups_manage_created" on public.study_groups
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "study_groups_delete_created" on public.study_groups;
create policy "study_groups_delete_created" on public.study_groups
  for delete to authenticated using (created_by = auth.uid());

drop policy if exists "group_memberships_read_authenticated" on public.group_memberships;
create policy "group_memberships_read_authenticated" on public.group_memberships
  for select to authenticated using (true);

drop policy if exists "group_memberships_join_self" on public.group_memberships;
create policy "group_memberships_join_self" on public.group_memberships
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "group_memberships_leave_self" on public.group_memberships;
create policy "group_memberships_leave_self" on public.group_memberships
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "peer_matches_read_participant" on public.peer_matches;
create policy "peer_matches_read_participant" on public.peer_matches
  for select to authenticated
  using (auth.uid() in (user_one_id, user_two_id));

drop policy if exists "peer_matches_request_as_self" on public.peer_matches;
create policy "peer_matches_request_as_self" on public.peer_matches
  for insert to authenticated
  with check (user_one_id = auth.uid());

drop policy if exists "peer_matches_update_participant" on public.peer_matches;
create policy "peer_matches_update_participant" on public.peer_matches
  for update to authenticated
  using (auth.uid() in (user_one_id, user_two_id))
  with check (auth.uid() in (user_one_id, user_two_id));

drop policy if exists "posts_read_visible" on public.posts;
create policy "posts_read_visible" on public.posts
  for select to authenticated using (is_flagged = false or user_id = auth.uid());

drop policy if exists "posts_create_own" on public.posts;
create policy "posts_create_own" on public.posts
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.sync_study_group_member_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.study_groups
  set member_count = (
    select count(*)::integer
    from public.group_memberships
    where group_id = coalesce(new.group_id, old.group_id)
  ),
  updated_at = now()
  where id = coalesce(new.group_id, old.group_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_study_group_member_count_trigger on public.group_memberships;
create trigger sync_study_group_member_count_trigger
after insert or delete on public.group_memberships
for each row execute function public.sync_study_group_member_count();

create or replace function public.get_match_candidates()
returns table (
  id uuid,
  full_name text,
  learning_styles text[],
  gender text,
  preferred_gender text,
  daily_study_goal_minutes integer,
  has_onboarded boolean,
  match_timezone text,
  match_availability jsonb,
  match_goals text,
  match_subjects text[],
  match_profile_completed boolean
)
language sql
security definer
set search_path = ''
as $$
  select
    p.id,
    p.full_name,
    p.learning_styles,
    p.gender,
    p.preferred_gender,
    p.daily_study_goal_minutes,
    p.has_onboarded,
    p.match_timezone,
    p.match_availability,
    p.match_goals,
    p.match_subjects,
    p.match_profile_completed
  from public.profiles p
  where p.id <> auth.uid()
    and p.has_onboarded = true
    and p.match_profile_completed = true;
$$;

revoke all on function public.get_match_candidates() from public;
grant execute on function public.get_match_candidates() to authenticated;
