-- Country-aware onboarding and auditable course selections.

alter table public.profiles
  add column if not exists country text;

alter table public.courses
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists course_source text not null default 'custom',
  add column if not exists catalog_key text;

alter table public.courses
  drop constraint if exists courses_course_source_check,
  add constraint courses_course_source_check
    check (course_source in ('catalog', 'custom', 'exam_suggestion'));

create index if not exists courses_user_source_idx
  on public.courses (user_id, course_source, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, grade_level, language, email, country)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'grade_level',
    coalesce(new.raw_user_meta_data->>'language', 'en'),
    new.email,
    nullif(upper(trim(new.raw_user_meta_data->>'country')), '')
  )
  on conflict (id) do update set
    email = excluded.email,
    language = coalesce(public.profiles.language, excluded.language),
    country = coalesce(public.profiles.country, excluded.country);
  return new;
end;
$$;

create or replace function public.admin_get_course_selections()
returns table (
  id uuid,
  user_id uuid,
  student_name text,
  student_email text,
  country text,
  course_name text,
  course_source text,
  catalog_key text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Administrator permission required';
  end if;

  return query
  select
    c.id,
    c.user_id,
    coalesce(p.full_name, 'Student'),
    coalesce(p.email, ''),
    p.country,
    c.name,
    c.course_source,
    c.catalog_key,
    c.created_at
  from public.courses c
  join public.profiles p on p.id = c.user_id
  order by c.created_at desc;
end;
$$;

revoke all on function public.admin_get_course_selections() from public, anon;
grant execute on function public.admin_get_course_selections() to authenticated, service_role;
