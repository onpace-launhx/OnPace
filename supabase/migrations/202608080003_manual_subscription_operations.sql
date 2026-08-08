-- Auditable manual billing, activation codes, bulk plan operations, and
-- reliable promo redemption reporting. This migration never deletes or
-- resets learning data (tasks, notes, sessions, courses, or chat history).

create or replace function public.can_manage_billing(user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and (
        p.role = 'super_admin'
        or (
          p.role = 'admin'
          and coalesce(p.permissions, '{}'::text[]) @> array['manage_billing']::text[]
        )
      )
  );
$$;

create table if not exists public.manual_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  plan text not null check (plan in ('pro', 'founding')),
  provider text not null default 'eshipx',
  provider_reference text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly', 'one_time', 'trial')),
  trial_days integer check (trial_days is null or trial_days between 1 and 365),
  renewal_cycle text check (renewal_cycle is null or renewal_cycle in ('monthly', 'yearly')),
  status text not null default 'pending_activation' check (
    status in ('pending_activation', 'active', 'cancel_at_period_end', 'canceled', 'expired', 'refunded')
  ),
  period_start timestamptz not null,
  period_end timestamptz,
  next_renewal_at timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  cancellation_effective_at timestamptz,
  internal_note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  activated_at timestamptz,
  activated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end is null or period_end > period_start),
  check (next_renewal_at is null or next_renewal_at >= period_start)
);

create unique index if not exists manual_subscriptions_provider_reference_unique
  on public.manual_subscriptions (provider, provider_reference)
  where provider_reference is not null and provider_reference <> '';
create index if not exists manual_subscriptions_user_created_idx
  on public.manual_subscriptions (user_id, created_at desc);
create index if not exists manual_subscriptions_status_idx
  on public.manual_subscriptions (status, next_renewal_at);

create table if not exists public.subscription_activation_codes (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.manual_subscriptions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  code_hash text not null unique,
  code_hint text not null,
  status text not null default 'active' check (status in ('active', 'redeemed', 'revoked', 'expired')),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists subscription_activation_codes_lookup_idx
  on public.subscription_activation_codes (code_hash, status, expires_at);

create table if not exists public.bulk_plan_operations (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('reset_to_free', 'start_trial', 'set_pro', 'cancel_at_period_end')),
  target_filter jsonb not null default '{}'::jsonb,
  preview_count integer not null default 0 check (preview_count >= 0),
  confirmation_hash text not null,
  status text not null default 'preview' check (status in ('preview', 'completed', 'expired', 'failed')),
  affected_count integer not null default 0 check (affected_count >= 0),
  expires_at timestamptz not null,
  executed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists bulk_plan_operations_created_idx
  on public.bulk_plan_operations (requested_by, created_at desc);

-- Reconcile the cached counter with the auditable redemption ledger.
update public.promocodes promo
set uses_count = ledger.actual_uses
from (
  select promocode_id, count(*)::integer as actual_uses
  from public.promo_redemptions
  group by promocode_id
) ledger
where promo.id = ledger.promocode_id
  and promo.uses_count is distinct from ledger.actual_uses;

alter table public.manual_subscriptions enable row level security;
alter table public.subscription_activation_codes enable row level security;
alter table public.bulk_plan_operations enable row level security;

drop policy if exists "manual_subscriptions_select_own_or_billing_admin" on public.manual_subscriptions;
create policy "manual_subscriptions_select_own_or_billing_admin"
  on public.manual_subscriptions for select
  using (auth.uid() = user_id or public.can_manage_billing(auth.uid()));

drop policy if exists "activation_codes_billing_admin_only" on public.subscription_activation_codes;
create policy "activation_codes_billing_admin_only"
  on public.subscription_activation_codes for select
  using (public.can_manage_billing(auth.uid()));

drop policy if exists "bulk_plan_operations_billing_admin_only" on public.bulk_plan_operations;
create policy "bulk_plan_operations_billing_admin_only"
  on public.bulk_plan_operations for select
  using (public.can_manage_billing(auth.uid()));

create or replace function public.refresh_my_subscription_access()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.profiles
  set plan = 'free', subscription_status = 'expired', billing_cycle = 'none',
      next_billing_date = null, updated_at = now()
  where id = auth.uid()
    and subscription_status = 'cancel_at_period_end'
    and pro_expires_at is not null
    and pro_expires_at <= now();
  changed := found;
  if changed then
    update public.manual_subscriptions
    set status = 'expired', updated_by = auth.uid(), updated_at = now()
    where user_id = auth.uid() and status = 'cancel_at_period_end';
    insert into public.subscription_events(user_id, event_type, previous_plan, next_plan, note, created_by)
    values (auth.uid(), 'scheduled_cancellation_completed', 'pro', 'free', 'Scheduled cancellation became effective; learning data preserved.', auth.uid());
  end if;
  return changed;
end;
$$;

-- Keep historical redemption facts immutable in reports. A later manual plan
-- change must not rewrite the originally granted promo duration.
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
    r.trial_started_at, r.trial_ends_at,
    p.plan, p.subscription_status
  from public.promo_redemptions r
  join public.profiles p on p.id = r.user_id
  left join auth.users u on u.id = r.user_id
  union all
  select
    p.id, null::uuid, coalesce(p.active_promocode, 'historical'), p.id,
    coalesce(p.full_name, 'Student'), coalesce(u.email::text, ''),
    'free_trial'::text,
    greatest(1, ceil(extract(epoch from (p.trial_ends_at - coalesce(p.trial_start_at, u.created_at))) / 86400)::integer),
    coalesce(p.trial_start_at, u.created_at, now()),
    coalesce(p.trial_start_at, u.created_at), p.trial_ends_at,
    p.plan, p.subscription_status
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.trial_ends_at is not null
    and not exists (select 1 from public.promo_redemptions r where r.user_id = p.id)
  order by redeemed_at desc;
end;
$$;

-- Admin corrections affect current access only. Redemption history remains an
-- accurate record of the benefit originally issued by the campaign.
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
declare
  old_plan text;
begin
  if not public.is_admin(auth.uid()) then raise exception 'Administrator permission required'; end if;
  if p_plan not in ('free', 'pro', 'founding') then raise exception 'Invalid plan'; end if;
  if p_trial_start is not null and p_trial_end is not null and p_trial_end <= p_trial_start then
    raise exception 'Trial end must be later than trial start';
  end if;
  select plan into old_plan from public.profiles where id = p_user_id for update;
  update public.profiles set
    plan = p_plan,
    trial_start_at = p_trial_start,
    trial_ends_at = p_trial_end,
    subscription_status = case when p_plan = 'free' then 'none' when p_trial_end is not null then 'trialing' else 'active' end,
    billing_cycle = case when p_plan = 'free' then 'none' when p_trial_end is null and p_next_billing is null then 'lifetime' else coalesce(nullif(billing_cycle, 'none'), 'none') end,
    promocode_expires_at = case when p_trial_end is not null then p_trial_end else null end,
    active_promocode = case when p_plan = 'free' then null else active_promocode end,
    grace_days_granted = greatest(coalesce(p_grace_days, 0), 0),
    failed_payment_attempts = greatest(coalesce(p_failed_attempts, 0), 0),
    next_billing_date = p_next_billing,
    updated_at = now()
  where id = p_user_id;
  insert into public.subscription_events(user_id, event_type, previous_plan, next_plan, note, metadata, created_by)
  values (p_user_id, 'admin_access_adjusted', old_plan, p_plan, 'Current access adjusted; learning data preserved.', jsonb_build_object('trial_start', p_trial_start, 'trial_end', p_trial_end, 'next_billing', p_next_billing), auth.uid());
end;
$$;

revoke all on function public.can_manage_billing(uuid) from public, anon;
grant execute on function public.can_manage_billing(uuid) to authenticated, service_role;
revoke all on function public.refresh_my_subscription_access() from public, anon;
grant execute on function public.refresh_my_subscription_access() to authenticated, service_role;
revoke all on function public.admin_get_promo_redemptions() from public, anon;
grant execute on function public.admin_get_promo_redemptions() to authenticated, service_role;
revoke all on function public.admin_update_trial_access(uuid, text, timestamptz, timestamptz, integer, integer, timestamptz) from public, anon;
grant execute on function public.admin_update_trial_access(uuid, text, timestamptz, timestamptz, integer, integer, timestamptz) to authenticated, service_role;
