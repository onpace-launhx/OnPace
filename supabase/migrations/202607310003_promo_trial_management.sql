-- Exact promo trial durations, auditable redemptions, and administrator controls.

alter table public.profiles
  add column if not exists trial_start_at timestamptz default now(),
  add column if not exists active_promocode text,
  add column if not exists promocode_expires_at timestamptz,
  add column if not exists subscription_status text default 'none',
  add column if not exists billing_cycle text default 'none',
  add column if not exists grace_days_granted integer default 0,
  add column if not exists failed_payment_attempts integer default 0,
  add column if not exists next_billing_date timestamptz;

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promocode_id uuid not null references public.promocodes(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  code_snapshot text not null,
  discount_type text not null,
  granted_value integer not null,
  redeemed_at timestamptz not null default now(),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (promocode_id, user_id)
);

create index if not exists promo_redemptions_code_idx
  on public.promo_redemptions (promocode_id, redeemed_at desc);
create index if not exists promo_redemptions_user_idx
  on public.promo_redemptions (user_id, redeemed_at desc);

alter table public.promo_redemptions enable row level security;

-- Recover historical promo usage from signup metadata without changing anyone's
-- current trial dates. Administrators can correct those dates from the UI.
insert into public.promo_redemptions (
  promocode_id,
  user_id,
  code_snapshot,
  discount_type,
  granted_value,
  redeemed_at,
  trial_started_at,
  trial_ends_at
)
select
  promo.id,
  profile.id,
  promo.code,
  promo.discount_type,
  promo.discount_value,
  coalesce(auth_user.created_at, now()),
  case when promo.discount_type = 'free_trial' then profile.trial_start_at end,
  case when promo.discount_type = 'free_trial' then profile.trial_ends_at end
from public.profiles profile
join auth.users auth_user on auth_user.id = profile.id
join public.promocodes promo
  on lower(promo.code) = lower(trim(auth_user.raw_user_meta_data->>'promocode'))
where nullif(trim(auth_user.raw_user_meta_data->>'promocode'), '') is not null
on conflict (promocode_id, user_id) do nothing;

update public.profiles profile
set
  active_promocode = redemption.code_snapshot,
  promocode_expires_at = case
    when redemption.discount_type = 'free_trial' then profile.trial_ends_at
    else profile.promocode_expires_at
  end
from public.promo_redemptions redemption
where redemption.user_id = profile.id
  and profile.active_promocode is null;

create or replace function public.validate_promocode(p_code text)
returns table (
  valid boolean,
  error_message text,
  discount_type text,
  discount_value integer,
  description text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  promo public.promocodes%rowtype;
begin
  select * into promo
  from public.promocodes
  where lower(code) = lower(trim(p_code))
  limit 1;

  if promo.id is null then
    return query select false, 'Invalid promo code.', null::text, null::integer, null::text;
    return;
  end if;
  if now() < promo.start_date or now() > promo.end_date then
    return query select false, 'This promo code has expired or is not active yet.', null::text, null::integer, null::text;
    return;
  end if;
  if promo.max_uses is not null and promo.uses_count >= promo.max_uses then
    return query select false, 'This promo code has reached its maximum usage limit.', null::text, null::integer, null::text;
    return;
  end if;

  return query select
    true,
    null::text,
    promo.discount_type,
    promo.discount_value,
    case
      when promo.discount_type = 'lifetime' then 'Lifetime Free Pro Access'
      when promo.discount_type = 'free_trial' then promo.discount_value || ' Days Free Pro Trial'
      else promo.discount_value || '% Discount on Purchase'
    end;
end;
$$;

create or replace function public.redeem_promocode(p_code text)
returns table (
  discount_type text,
  discount_value integer,
  trial_started_at timestamptz,
  trial_ends_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  promo public.promocodes%rowtype;
  target_user uuid := auth.uid();
  trial_start timestamptz;
  trial_end timestamptz;
begin
  if target_user is null then
    raise exception 'Unauthorized';
  end if;

  select * into promo
  from public.promocodes
  where lower(code) = lower(trim(p_code))
  for update;

  if promo.id is null then raise exception 'Invalid promo code.'; end if;
  if now() < promo.start_date or now() > promo.end_date then
    raise exception 'This promo code has expired or is not active yet.';
  end if;
  if promo.max_uses is not null and promo.uses_count >= promo.max_uses then
    raise exception 'This promo code has reached its maximum usage limit.';
  end if;
  if exists (
    select 1 from public.promo_redemptions r
    where r.promocode_id = promo.id and r.user_id = target_user
  ) then
    raise exception 'This promo code has already been used on this account.';
  end if;

  if promo.discount_type = 'free_trial' then
    if promo.discount_value < 1 then raise exception 'Trial duration must be at least one day.'; end if;
    trial_start := now();
    trial_end := trial_start + make_interval(days => promo.discount_value);
    update public.profiles set
      plan = 'pro',
      subscription_status = 'trialing',
      billing_cycle = 'none',
      trial_start_at = trial_start,
      trial_ends_at = trial_end,
      active_promocode = promo.code,
      promocode_expires_at = trial_end
    where id = target_user;
  elsif promo.discount_type = 'lifetime' then
    update public.profiles set
      plan = 'pro',
      subscription_status = 'active',
      billing_cycle = 'lifetime',
      trial_start_at = null,
      trial_ends_at = null,
      active_promocode = promo.code,
      promocode_expires_at = null
    where id = target_user;
  else
    update public.profiles set
      discount_percent = promo.discount_value,
      active_promocode = promo.code,
      promocode_expires_at = promo.end_date
    where id = target_user;
  end if;

  update public.promocodes
  set uses_count = uses_count + 1
  where id = promo.id;

  insert into public.promo_redemptions (
    promocode_id, user_id, code_snapshot, discount_type, granted_value,
    trial_started_at, trial_ends_at
  ) values (
    promo.id, target_user, promo.code, promo.discount_type, promo.discount_value,
    trial_start, trial_end
  );

  return query select promo.discount_type, promo.discount_value, trial_start, trial_end;
end;
$$;

-- The latest onboarding trigger keeps country/language support and restores
-- exact promo processing that a previous trigger revision accidentally removed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  promo_code text := nullif(trim(new.raw_user_meta_data->>'promocode'), '');
  promo public.promocodes%rowtype;
  trial_start timestamptz;
  trial_end timestamptz;
begin
  if promo_code is not null then
    select * into promo
    from public.promocodes
    where lower(code) = lower(promo_code)
      and now() between start_date and end_date
      and (max_uses is null or uses_count < max_uses)
    for update;
  end if;

  if promo.id is not null and promo.discount_type = 'free_trial' and promo.discount_value >= 1 then
    trial_start := now();
    trial_end := trial_start + make_interval(days => promo.discount_value);
    insert into public.profiles (
      id, full_name, grade_level, language, email, country, plan,
      trial_start_at, trial_ends_at, subscription_status, billing_cycle,
      active_promocode, promocode_expires_at
    ) values (
      new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'grade_level',
      coalesce(new.raw_user_meta_data->>'language', 'en'), new.email,
      nullif(upper(trim(new.raw_user_meta_data->>'country')), ''), 'pro',
      trial_start, trial_end, 'trialing', 'none', promo.code, trial_end
    ) on conflict (id) do update set
      email = excluded.email,
      language = coalesce(public.profiles.language, excluded.language),
      country = coalesce(public.profiles.country, excluded.country),
      plan = excluded.plan,
      trial_start_at = excluded.trial_start_at,
      trial_ends_at = excluded.trial_ends_at,
      subscription_status = excluded.subscription_status,
      billing_cycle = excluded.billing_cycle,
      active_promocode = excluded.active_promocode,
      promocode_expires_at = excluded.promocode_expires_at;
  elsif promo.id is not null and promo.discount_type = 'lifetime' then
    insert into public.profiles (
      id, full_name, grade_level, language, email, country, plan,
      trial_start_at, trial_ends_at, subscription_status, billing_cycle,
      active_promocode
    ) values (
      new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'grade_level',
      coalesce(new.raw_user_meta_data->>'language', 'en'), new.email,
      nullif(upper(trim(new.raw_user_meta_data->>'country')), ''), 'pro',
      null, null, 'active', 'lifetime', promo.code
    ) on conflict (id) do update set
      email = excluded.email,
      plan = excluded.plan,
      trial_start_at = null,
      trial_ends_at = null,
      subscription_status = excluded.subscription_status,
      billing_cycle = excluded.billing_cycle,
      active_promocode = excluded.active_promocode;
  elsif promo.id is not null and promo.discount_type = 'percentage' then
    insert into public.profiles (
      id, full_name, grade_level, language, email, country,
      discount_percent, active_promocode, promocode_expires_at
    ) values (
      new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'grade_level',
      coalesce(new.raw_user_meta_data->>'language', 'en'), new.email,
      nullif(upper(trim(new.raw_user_meta_data->>'country')), ''),
      promo.discount_value, promo.code, promo.end_date
    ) on conflict (id) do update set
      email = excluded.email,
      discount_percent = excluded.discount_percent,
      active_promocode = excluded.active_promocode,
      promocode_expires_at = excluded.promocode_expires_at;
  else
    insert into public.profiles (id, full_name, grade_level, language, email, country)
    values (
      new.id,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'grade_level',
      coalesce(new.raw_user_meta_data->>'language', 'en'),
      new.email,
      nullif(upper(trim(new.raw_user_meta_data->>'country')), '')
    ) on conflict (id) do update set
      email = excluded.email,
      language = coalesce(public.profiles.language, excluded.language),
      country = coalesce(public.profiles.country, excluded.country);
  end if;

  if promo.id is not null then
    update public.promocodes set uses_count = uses_count + 1 where id = promo.id;
    insert into public.promo_redemptions (
      promocode_id, user_id, code_snapshot, discount_type, granted_value,
      trial_started_at, trial_ends_at
    ) values (
      promo.id, new.id, promo.code, promo.discount_type, promo.discount_value,
      trial_start, trial_end
    ) on conflict (promocode_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.admin_get_trial_profiles()
returns table (
  id uuid,
  full_name text,
  grade_level text,
  role text,
  plan text,
  trial_ends_at timestamptz,
  created_at timestamptz,
  discount_percent integer,
  permissions text[],
  email text,
  trial_start_at timestamptz,
  grace_days_granted integer,
  failed_payment_attempts integer,
  next_billing_date timestamptz,
  subscription_status text,
  billing_cycle text,
  active_promocode text,
  promocode_expires_at timestamptz,
  language text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Administrator permission required'; end if;
  return query
  select
    p.id, p.full_name, p.grade_level, p.role, p.plan, p.trial_ends_at,
    u.created_at, p.discount_percent, p.permissions, u.email::text,
    p.trial_start_at, p.grace_days_granted, p.failed_payment_attempts,
    p.next_billing_date, p.subscription_status, p.billing_cycle,
    p.active_promocode, p.promocode_expires_at, p.language
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.full_name nulls last, u.email;
end;
$$;

create or replace function public.admin_get_promo_redemptions()
returns table (
  id uuid,
  promocode_id uuid,
  code text,
  user_id uuid,
  full_name text,
  email text,
  discount_type text,
  granted_value integer,
  redeemed_at timestamptz,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  plan text,
  subscription_status text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Administrator permission required'; end if;
  return query
  select
    r.id, r.promocode_id, r.code_snapshot, r.user_id,
    coalesce(p.full_name, 'Student'), coalesce(u.email::text, ''),
    r.discount_type, r.granted_value, r.redeemed_at,
    coalesce(p.trial_start_at, r.trial_started_at),
    coalesce(p.trial_ends_at, r.trial_ends_at),
    p.plan, p.subscription_status
  from public.promo_redemptions r
  join public.profiles p on p.id = r.user_id
  left join auth.users u on u.id = r.user_id
  union all
  select
    p.id,
    null::uuid,
    coalesce(p.active_promocode, '—'),
    p.id,
    coalesce(p.full_name, 'Student'),
    coalesce(u.email::text, ''),
    'free_trial'::text,
    greatest(1, ceil(extract(epoch from (p.trial_ends_at - coalesce(p.trial_start_at, u.created_at))) / 86400)::integer),
    coalesce(p.trial_start_at, u.created_at, now()),
    coalesce(p.trial_start_at, u.created_at),
    p.trial_ends_at,
    p.plan,
    p.subscription_status
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.trial_ends_at is not null
    and not exists (
      select 1 from public.promo_redemptions r where r.user_id = p.id
    )
  order by redeemed_at desc;
end;
$$;

create or replace function public.admin_update_trial_access(
  p_user_id uuid,
  p_plan text,
  p_trial_start timestamptz,
  p_trial_end timestamptz,
  p_grace_days integer,
  p_failed_attempts integer,
  p_next_billing timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Administrator permission required'; end if;
  if p_plan not in ('free', 'pro', 'founding') then raise exception 'Invalid plan'; end if;
  if p_trial_start is not null and p_trial_end is not null and p_trial_end <= p_trial_start then
    raise exception 'Trial end must be later than trial start';
  end if;

  update public.profiles set
    plan = p_plan,
    trial_start_at = p_trial_start,
    trial_ends_at = p_trial_end,
    subscription_status = case
      when p_plan = 'free' then 'none'
      when p_trial_end is not null then 'trialing'
      else 'active'
    end,
    billing_cycle = case
      when p_plan = 'free' then 'none'
      when p_trial_end is null and p_next_billing is null then 'lifetime'
      else coalesce(nullif(billing_cycle, 'none'), 'none')
    end,
    promocode_expires_at = case when p_trial_end is not null then p_trial_end else null end,
    active_promocode = case when p_plan = 'free' then null else active_promocode end,
    grace_days_granted = greatest(coalesce(p_grace_days, 0), 0),
    failed_payment_attempts = greatest(coalesce(p_failed_attempts, 0), 0),
    next_billing_date = p_next_billing,
    updated_at = now()
  where id = p_user_id;

  update public.promo_redemptions set
    trial_started_at = p_trial_start,
    trial_ends_at = p_trial_end,
    updated_at = now()
  where id = (
    select id from public.promo_redemptions
    where user_id = p_user_id
    order by redeemed_at desc
    limit 1
  );
end;
$$;

revoke all on function public.validate_promocode(text) from public;
grant execute on function public.validate_promocode(text) to anon, authenticated, service_role;
revoke all on function public.redeem_promocode(text) from public, anon;
grant execute on function public.redeem_promocode(text) to authenticated, service_role;
revoke all on function public.admin_get_trial_profiles() from public, anon;
grant execute on function public.admin_get_trial_profiles() to authenticated, service_role;
revoke all on function public.admin_get_promo_redemptions() from public, anon;
grant execute on function public.admin_get_promo_redemptions() to authenticated, service_role;
revoke all on function public.admin_update_trial_access(uuid, text, timestamptz, timestamptz, integer, integer, timestamptz) from public, anon;
grant execute on function public.admin_update_trial_access(uuid, text, timestamptz, timestamptz, integer, integer, timestamptz) to authenticated, service_role;
