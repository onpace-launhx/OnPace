-- Secure one-code email changes and auditable, one-click email rewards.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.email_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  old_email text not null,
  new_email text not null,
  token_hash text not null,
  language text not null default 'en',
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_change_requests_pending
  on public.email_change_requests (user_id, created_at desc)
  where consumed_at is null;

alter table public.email_change_requests enable row level security;
revoke all on public.email_change_requests from anon, authenticated;
grant all on public.email_change_requests to service_role;

create table if not exists public.email_reward_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token_hash text not null unique,
  reward_plan text not null default 'pro'
    check (reward_plan in ('pro', 'plus')),
  reward_days integer not null check (reward_days between 1 and 3650),
  expires_at timestamptz not null,
  max_claims integer,
  claims_count integer not null default 0,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_reward_eligibility (
  campaign_id uuid not null references public.email_reward_campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  claimed_at timestamptz,
  primary key (campaign_id, user_id)
);

create index if not exists idx_email_reward_campaigns_expiry
  on public.email_reward_campaigns (expires_at)
  where active = true;

alter table public.email_reward_campaigns enable row level security;
alter table public.email_reward_eligibility enable row level security;
revoke all on public.email_reward_campaigns from anon, authenticated;
revoke all on public.email_reward_eligibility from anon, authenticated;
grant all on public.email_reward_campaigns to service_role;
grant all on public.email_reward_eligibility to service_role;

alter table public.notifications
  add column if not exists action_url text;

create or replace function public.claim_email_reward(claim_token text)
returns table (
  success boolean,
  reward_plan text,
  reward_days integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  campaign_record public.email_reward_campaigns%rowtype;
  eligibility_record public.email_reward_eligibility%rowtype;
  current_profile public.profiles%rowtype;
  base_expiry timestamptz;
  next_expiry timestamptz;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if claim_token is null or length(claim_token) < 24 then
    raise exception 'Invalid reward link';
  end if;

  select c.*
  into campaign_record
  from public.email_reward_campaigns c
  where c.token_hash = encode(extensions.digest(claim_token, 'sha256'), 'hex')
    and c.active = true
    and c.expires_at > now()
  for update;

  if not found then
    raise exception 'Reward link is invalid or expired';
  end if;

  if campaign_record.max_claims is not null
    and campaign_record.claims_count >= campaign_record.max_claims then
    raise exception 'Reward claim limit reached';
  end if;

  select e.*
  into eligibility_record
  from public.email_reward_eligibility e
  where e.campaign_id = campaign_record.id
    and e.user_id = current_user_id
  for update;

  if not found then
    raise exception 'This reward was not assigned to your account';
  end if;

  if eligibility_record.claimed_at is not null then
    raise exception 'This reward has already been claimed';
  end if;

  select p.*
  into current_profile
  from public.profiles p
  where p.id = current_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  base_expiry := greatest(
    now(),
    coalesce(current_profile.trial_ends_at, now()),
    coalesce(current_profile.pro_expires_at, now())
  );
  next_expiry := base_expiry + make_interval(days => campaign_record.reward_days);

  update public.profiles
  set
    plan = campaign_record.reward_plan,
    subscription_status = 'active',
    trial_ends_at = next_expiry,
    pro_expires_at = next_expiry
  where id = current_user_id;

  update public.email_reward_eligibility
  set claimed_at = now()
  where campaign_id = campaign_record.id and user_id = current_user_id;

  update public.email_reward_campaigns
  set claims_count = claims_count + 1
  where id = campaign_record.id;

  insert into public.subscription_events (
    user_id,
    event_type,
    previous_plan,
    next_plan,
    note,
    metadata,
    created_by
  )
  values (
    current_user_id,
    'email_reward_claimed',
    current_profile.plan,
    campaign_record.reward_plan,
    campaign_record.name,
    jsonb_build_object(
      'campaign_id', campaign_record.id,
      'reward_days', campaign_record.reward_days,
      'expires_at', next_expiry
    ),
    campaign_record.created_by
  );

  return query
  select true, campaign_record.reward_plan, campaign_record.reward_days, next_expiry;
end;
$$;

revoke all on function public.claim_email_reward(text) from public, anon;
grant execute on function public.claim_email_reward(text) to authenticated, service_role;
