-- Keep the profile cache in sync with the authoritative manual subscription.
-- This prevents an older trial or complimentary campaign from being shown after
-- an EshipX payment has been matched and activated.

alter table public.system_settings
  add column if not exists billing_notification_bcc text[] not null default '{}'::text[];

create table if not exists public.subscription_cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid not null references public.manual_subscriptions(id) on delete cascade,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  user_note text,
  admin_note text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscription_cancellation_requests_one_open_per_subscription
  on public.subscription_cancellation_requests(subscription_id)
  where status = 'submitted';

create index if not exists subscription_cancellation_requests_status_requested_idx
  on public.subscription_cancellation_requests(status, requested_at desc);

alter table public.subscription_cancellation_requests enable row level security;

drop policy if exists "cancellation_requests_select_own_or_billing_admin" on public.subscription_cancellation_requests;
create policy "cancellation_requests_select_own_or_billing_admin"
  on public.subscription_cancellation_requests for select
  using (auth.uid() = user_id or public.can_manage_billing(auth.uid()));

create or replace function public.sync_profile_from_active_manual_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_trial_end timestamptz;
begin
  if new.status <> 'active' then
    return new;
  end if;

  if new.billing_cycle <> 'one_time'
     and new.period_end is not null
     and new.period_end <= now() then
    return new;
  end if;

  active_trial_end := case
    when coalesce(new.trial_days, 0) > 0
      and new.renewal_cycle is not null
      and new.next_renewal_at is not null
      and new.next_renewal_at > now()
      then new.next_renewal_at
    else null
  end;

  update public.profiles
  set
    plan = new.plan,
    subscription_status = case when active_trial_end is null then 'active' else 'trialing' end,
    billing_cycle = case when new.billing_cycle = 'one_time' then 'lifetime' else new.billing_cycle end,
    trial_start_at = case when active_trial_end is null then null else new.period_start end,
    trial_ends_at = active_trial_end,
    pro_expires_at = case when new.billing_cycle = 'one_time' then null else new.period_end end,
    next_billing_date = new.next_renewal_at,
    complimentary_campaign_id = null,
    updated_at = now()
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists sync_profile_from_active_manual_subscription on public.manual_subscriptions;
create trigger sync_profile_from_active_manual_subscription
  after insert or update of status, plan, billing_cycle, trial_days, renewal_cycle, period_start, period_end, next_renewal_at
  on public.manual_subscriptions
  for each row execute function public.sync_profile_from_active_manual_subscription();

-- Repair already-activated subscriptions without touching the subscription,
-- study, calendar, notes, task, or chat data of any account.
with current_manual_access as (
  select distinct on (s.user_id)
    s.user_id,
    s.plan,
    s.billing_cycle,
    s.trial_days,
    s.renewal_cycle,
    s.period_start,
    s.period_end,
    s.next_renewal_at
  from public.manual_subscriptions s
  where s.status = 'active'
    and (s.billing_cycle = 'one_time' or s.period_end is null or s.period_end > now())
  order by s.user_id, s.activated_at desc nulls last, s.created_at desc
)
update public.profiles p
set
  plan = s.plan,
  subscription_status = case
    when coalesce(s.trial_days, 0) > 0
      and s.renewal_cycle is not null
      and s.next_renewal_at is not null
      and s.next_renewal_at > now()
      then 'trialing'
    else 'active'
  end,
  billing_cycle = case when s.billing_cycle = 'one_time' then 'lifetime' else s.billing_cycle end,
  trial_start_at = case
    when coalesce(s.trial_days, 0) > 0 and s.renewal_cycle is not null and s.next_renewal_at > now()
      then s.period_start
    else null
  end,
  trial_ends_at = case
    when coalesce(s.trial_days, 0) > 0 and s.renewal_cycle is not null and s.next_renewal_at > now()
      then s.next_renewal_at
    else null
  end,
  pro_expires_at = case when s.billing_cycle = 'one_time' then null else s.period_end end,
  next_billing_date = s.next_renewal_at,
  complimentary_campaign_id = null,
  updated_at = now()
from current_manual_access s
where p.id = s.user_id;

notify pgrst, 'reload schema';
