-- Direct administrator activations, optional trial + recurring packages,
-- Eastern-time bulk access campaigns, and required user timezone metadata.
-- No learning data is deleted by any function in this migration.

alter table public.profiles
  add column if not exists timezone text,
  add column if not exists complimentary_campaign_id uuid;

create table if not exists public.bulk_access_campaigns (
  id uuid primary key default gen_random_uuid(),
  plan text not null default 'pro' check (plan in ('pro')),
  source_timezone text not null default 'America/New_York',
  source_local_end timestamp without time zone not null,
  ends_at timestamptz not null,
  auto_assign_new_users boolean not null default false,
  target_filter jsonb not null default '{"plan":"all"}'::jsonb,
  status text not null default 'active' check (status in ('active', 'ended', 'canceled')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > created_at)
);

alter table public.profiles
  drop constraint if exists profiles_complimentary_campaign_id_fkey,
  add constraint profiles_complimentary_campaign_id_fkey
    foreign key (complimentary_campaign_id)
    references public.bulk_access_campaigns(id) on delete set null;

create table if not exists public.bulk_access_campaign_members (
  campaign_id uuid not null references public.bulk_access_campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  notification_sent_at timestamptz,
  primary key (campaign_id, user_id)
);

create index if not exists bulk_access_campaigns_active_idx
  on public.bulk_access_campaigns (status, auto_assign_new_users, ends_at desc);
create index if not exists bulk_access_campaign_members_user_idx
  on public.bulk_access_campaign_members (user_id, assigned_at desc);

alter table public.bulk_access_campaigns enable row level security;
alter table public.bulk_access_campaign_members enable row level security;

drop policy if exists "bulk_campaigns_billing_admin_select" on public.bulk_access_campaigns;
create policy "bulk_campaigns_billing_admin_select"
  on public.bulk_access_campaigns for select
  using (public.can_manage_billing(auth.uid()));

drop policy if exists "bulk_campaign_members_select" on public.bulk_access_campaign_members;
create policy "bulk_campaign_members_select"
  on public.bulk_access_campaign_members for select
  using (auth.uid() = user_id or public.can_manage_billing(auth.uid()));

create or replace function public.admin_create_direct_membership(
  p_user_id uuid,
  p_plan text,
  p_billing_cycle text,
  p_amount numeric,
  p_currency text,
  p_provider_reference text default null,
  p_trial_days integer default null,
  p_admin_note text default null
)
returns table (
  subscription_id uuid,
  activated_user_id uuid,
  activated_plan text,
  activated_cycle text,
  activated_amount numeric,
  activated_currency text,
  activated_trial_days integer,
  activated_trial_end timestamptz,
  activated_period_end timestamptz,
  activated_next_billing timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_subscription_id uuid := gen_random_uuid();
  reference_value text := nullif(trim(coalesce(p_provider_reference, '')), '');
  currency_value text := upper(trim(coalesce(p_currency, 'USD')));
  trial_days_value integer := nullif(greatest(coalesce(p_trial_days, 0), 0), 0);
  starts_at timestamptz := now();
  trial_end_value timestamptz;
  period_end_value timestamptz;
  next_billing_value timestamptz;
  purchase_plan_type text;
begin
  if not public.can_manage_billing(auth.uid()) then
    raise exception 'Billing administrator permission required';
  end if;
  if p_plan not in ('pro', 'founding') then raise exception 'Invalid plan'; end if;
  if p_billing_cycle not in ('monthly', 'yearly', 'one_time') then raise exception 'Invalid billing cycle'; end if;
  if p_plan = 'founding' and p_billing_cycle <> 'one_time' then
    raise exception 'Founding membership must be one-time';
  end if;
  if p_plan = 'pro' and p_billing_cycle = 'one_time' then
    raise exception 'One-time access must use the Founding plan';
  end if;
  if p_amount < 0 then raise exception 'Amount cannot be negative'; end if;
  if char_length(currency_value) <> 3 then raise exception 'Currency must use a 3-letter code'; end if;
  if trial_days_value is not null and (trial_days_value > 365 or p_billing_cycle = 'one_time') then
    raise exception 'Trial days are only available for monthly or yearly plans';
  end if;
  if reference_value is null or char_length(reference_value) < 3 then
    raise exception 'A payment reference is required for every paid membership';
  end if;
  if reference_value is not null and char_length(reference_value) > 160 then
    raise exception 'Payment reference is too long';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found';
  end if;
  update public.manual_subscriptions
  set status = 'expired', next_renewal_at = null, updated_at = now(), updated_by = auth.uid()
  where user_id = p_user_id
    and status in ('active', 'cancel_at_period_end')
    and period_end is not null
    and period_end <= now();
  if exists (
    select 1 from public.manual_subscriptions
    where user_id = p_user_id
      and status in ('pending_activation', 'active', 'cancel_at_period_end')
  ) then
    raise exception 'This account already has an open manual subscription';
  end if;
  if reference_value is not null and exists (
    select 1 from public.eshipx_payment_references
    where lower(provider_reference) = lower(reference_value)
  ) then
    raise exception 'This EshipX reference is already in use';
  end if;

  trial_end_value := case
    when trial_days_value is not null then starts_at + make_interval(days => trial_days_value)
    else null
  end;
  period_end_value := case
    when p_billing_cycle = 'one_time' then null
    when p_billing_cycle = 'yearly' then coalesce(trial_end_value, starts_at) + interval '1 year'
    else coalesce(trial_end_value, starts_at) + interval '1 month'
  end;
  next_billing_value := case
    when trial_end_value is not null then trial_end_value
    else period_end_value
  end;

  insert into public.manual_subscriptions (
    id, user_id, plan, provider, provider_reference, amount, currency,
    billing_cycle, trial_days, renewal_cycle, status, period_start,
    period_end, next_renewal_at, internal_note, created_by, updated_by,
    activated_at, activated_by
  ) values (
    new_subscription_id, p_user_id, p_plan, 'eshipx', reference_value,
    p_amount, currency_value, p_billing_cycle, trial_days_value,
    case when trial_days_value is not null then p_billing_cycle else null end,
    'active', starts_at, period_end_value, next_billing_value,
    nullif(trim(coalesce(p_admin_note, '')), ''), auth.uid(), auth.uid(),
    now(), auth.uid()
  );

  if reference_value is not null and p_amount > 0 then
    insert into public.eshipx_payment_references (
      provider_reference, user_id, subscription_id, transaction_type,
      amount, currency, recorded_by
    ) values (
      reference_value, p_user_id, new_subscription_id, 'activation',
      p_amount, currency_value, auth.uid()
    );
  end if;

  update public.profiles set
    plan = p_plan,
    subscription_status = case when trial_end_value is not null then 'trialing' else 'active' end,
    billing_cycle = case when p_billing_cycle = 'one_time' then 'lifetime' else p_billing_cycle end,
    trial_start_at = case when trial_end_value is not null then starts_at else null end,
    trial_ends_at = trial_end_value,
    pro_expires_at = period_end_value,
    next_billing_date = next_billing_value,
    complimentary_campaign_id = null,
    updated_at = now()
  where id = p_user_id;

  if reference_value is not null and p_amount > 0 then
    purchase_plan_type := case
      when p_plan = 'founding' then 'founding_member'
      when p_billing_cycle = 'yearly' then 'pro_yearly'
      else 'pro_monthly'
    end;
    insert into public.purchase_history (
      user_id, plan_type, billing_cycle, amount, currency, status,
      payment_provider, provider_reference
    ) values (
      p_user_id, purchase_plan_type, p_billing_cycle, p_amount,
      currency_value, 'completed', 'eshipx', reference_value
    );
  end if;

  insert into public.subscription_events (
    user_id, event_type, previous_plan, next_plan, note, metadata, created_by
  ) values (
    p_user_id,
    case when trial_end_value is not null then 'manual_trial_subscription_started' else 'manual_subscription_activated' end,
    null, p_plan, 'Membership activated directly by billing administrator.',
    jsonb_build_object(
      'subscription_id', new_subscription_id,
      'billing_cycle', p_billing_cycle,
      'trial_days', trial_days_value,
      'trial_end', trial_end_value,
      'period_end', period_end_value,
      'next_billing', next_billing_value,
      'amount', p_amount,
      'currency', currency_value,
      'provider_reference', reference_value
    ),
    auth.uid()
  );

  return query select new_subscription_id, p_user_id, p_plan, p_billing_cycle,
    p_amount, currency_value, trial_days_value, trial_end_value,
    period_end_value, next_billing_value;
end;
$$;

create or replace function public.resolve_eastern_time(p_local timestamp without time zone)
returns timestamptz
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.can_manage_billing(auth.uid()) then
    raise exception 'Billing administrator permission required';
  end if;
  return p_local at time zone 'America/New_York';
end;
$$;

create or replace function public.admin_create_bulk_access_campaign(
  p_ends_at_eastern timestamp without time zone,
  p_auto_assign_new_users boolean default false,
  p_target_plan text default 'all'
)
returns table (
  campaign_id uuid,
  affected_count integer,
  ends_at_utc timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_campaign_id uuid;
  end_utc timestamptz := p_ends_at_eastern at time zone 'America/New_York';
  affected integer := 0;
begin
  if not public.can_manage_billing(auth.uid()) then
    raise exception 'Billing administrator permission required';
  end if;
  if p_target_plan not in ('all', 'free', 'pro', 'founding') then
    raise exception 'Invalid target filter';
  end if;
  if p_target_plan <> 'free' then
    raise exception 'Complimentary Pro access can only be granted to Free accounts';
  end if;
  if end_utc <= now() then raise exception 'Campaign end must be in the future'; end if;

  insert into public.bulk_access_campaigns (
    plan, source_local_end, ends_at, auto_assign_new_users,
    target_filter, created_by
  ) values (
    'pro', p_ends_at_eastern, end_utc, coalesce(p_auto_assign_new_users, false),
    jsonb_build_object('plan', p_target_plan), auth.uid()
  ) returning id into new_campaign_id;

  insert into public.bulk_access_campaign_members (campaign_id, user_id)
  select new_campaign_id, p.id
  from public.profiles p
  where p.role = 'student'
    and (p_target_plan = 'all' or p.plan = p_target_plan)
  on conflict do nothing;
  get diagnostics affected = row_count;

  insert into public.subscription_events (
    user_id, event_type, previous_plan, next_plan, note, metadata, created_by
  )
  select p.id, 'bulk_complimentary_access_granted', p.plan, 'pro',
    'Complimentary Pro access granted by administrator.',
    jsonb_build_object(
      'campaign_id', new_campaign_id,
      'source_timezone', 'America/New_York',
      'source_local_end', p_ends_at_eastern,
      'ends_at_utc', end_utc,
      'auto_assign_new_users', coalesce(p_auto_assign_new_users, false)
    ),
    auth.uid()
  from public.profiles p
  where exists (
    select 1 from public.bulk_access_campaign_members m
    where m.campaign_id = new_campaign_id and m.user_id = p.id
  );

  update public.profiles p set
    plan = 'pro', subscription_status = 'trialing', billing_cycle = 'none',
    trial_start_at = now(), trial_ends_at = end_utc,
    pro_expires_at = end_utc, next_billing_date = null,
    complimentary_campaign_id = new_campaign_id, updated_at = now()
  where exists (
    select 1 from public.bulk_access_campaign_members m
    where m.campaign_id = new_campaign_id and m.user_id = p.id
  );

  insert into public.notifications (user_id, title, content, type)
  select p.id,
    case coalesce(p.language, 'en')
      when 'tr' then 'Ücretsiz Pro erişiminiz tanımlandı'
      when 'es' then 'Tu acceso Pro gratuito está activo'
      when 'zh' then '您的免费 Pro 权限已开通'
      else 'Your complimentary Pro access is active'
    end,
    case coalesce(p.language, 'en')
      when 'tr' then 'Yönetici tarafından süreli ücretsiz Pro erişimi hesabınıza tanımlandı. Bitiş saati yerel saat diliminizde gösterilecektir.'
      when 'es' then 'Un administrador añadió acceso Pro gratuito por tiempo limitado. La hora de finalización se mostrará en tu zona horaria.'
      when 'zh' then '管理员已为您的账户添加限时免费 Pro 权限，结束时间将按您的当地时区显示。'
      else 'An administrator added time-limited complimentary Pro access. The end time will be shown in your local time zone.'
    end,
    'success'
  from public.profiles p
  where exists (
    select 1 from public.bulk_access_campaign_members m
    where m.campaign_id = new_campaign_id and m.user_id = p.id
  );

  return query select new_campaign_id, affected, end_utc;
end;
$$;

create or replace function public.apply_bulk_campaign_to_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign public.bulk_access_campaigns%rowtype;
  title_text text;
  content_text text;
  detected_timezone text;
begin
  if coalesce(new.role, 'student') <> 'student' then return new; end if;

  select nullif(trim(u.raw_user_meta_data->>'timezone'), '')
    into detected_timezone
  from auth.users u
  where u.id = new.id;
  if new.timezone is null and detected_timezone is not null then
    update public.profiles set timezone = detected_timezone where id = new.id;
  end if;

  select * into campaign
  from public.bulk_access_campaigns
  where status = 'active'
    and auto_assign_new_users = true
    and ends_at > now()
  order by ends_at desc, created_at desc
  limit 1;

  if campaign.id is null then return new; end if;

  update public.profiles set
    plan = 'pro', subscription_status = 'trialing', billing_cycle = 'none',
    trial_start_at = now(), trial_ends_at = campaign.ends_at,
    pro_expires_at = campaign.ends_at, next_billing_date = null,
    complimentary_campaign_id = campaign.id, updated_at = now()
  where id = new.id;

  insert into public.bulk_access_campaign_members (campaign_id, user_id)
  values (campaign.id, new.id)
  on conflict do nothing;

  title_text := case coalesce(new.language, 'en')
    when 'tr' then 'Ücretsiz Pro erişiminiz tanımlandı'
    when 'es' then 'Tu acceso Pro gratuito está activo'
    when 'zh' then '您的免费 Pro 权限已开通'
    else 'Your complimentary Pro access is active'
  end;
  content_text := case coalesce(new.language, 'en')
    when 'tr' then 'Yönetici tarafından süreli ücretsiz Pro erişimi hesabınıza tanımlandı.'
    when 'es' then 'Un administrador ha añadido acceso Pro gratuito por tiempo limitado a tu cuenta.'
    when 'zh' then '管理员已为您的账户添加限时免费 Pro 权限。'
    else 'An administrator added time-limited complimentary Pro access to your account.'
  end;
  insert into public.notifications (user_id, title, content, type)
  values (new.id, title_text, content_text, 'success');

  insert into public.subscription_events (
    user_id, event_type, previous_plan, next_plan, note, metadata, created_by
  ) values (
    new.id, 'bulk_campaign_auto_assigned', new.plan, 'pro',
    'Active complimentary campaign automatically assigned at registration.',
    jsonb_build_object('campaign_id', campaign.id, 'ends_at_utc', campaign.ends_at),
    campaign.created_by
  );
  return new;
end;
$$;

drop trigger if exists apply_bulk_campaign_after_profile_insert on public.profiles;
create trigger apply_bulk_campaign_after_profile_insert
after insert on public.profiles
for each row execute function public.apply_bulk_campaign_to_new_profile();

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
  set subscription_status = 'active', trial_start_at = null,
      trial_ends_at = null, next_billing_date = pro_expires_at,
      updated_at = now()
  where id = auth.uid()
    and subscription_status = 'trialing'
    and trial_ends_at is not null and trial_ends_at <= now()
    and billing_cycle in ('monthly', 'yearly')
    and pro_expires_at is not null and pro_expires_at > now();
  changed := changed or found;

  update public.manual_subscriptions s
  set next_renewal_at = s.period_end,
      updated_at = now()
  where s.user_id = auth.uid()
    and s.status = 'active'
    and s.trial_days is not null
    and s.billing_cycle in ('monthly', 'yearly')
    and s.next_renewal_at is not null
    and s.next_renewal_at <= now()
    and s.period_end is not null
    and s.period_end > now();
  changed := changed or found;

  update public.profiles
  set plan = 'free', subscription_status = 'expired', billing_cycle = 'none',
      trial_start_at = null, trial_ends_at = null, pro_expires_at = null,
      next_billing_date = null, complimentary_campaign_id = null,
      updated_at = now()
  where id = auth.uid()
    and (
      (subscription_status = 'trialing' and trial_ends_at is not null
        and trial_ends_at <= now() and billing_cycle = 'none')
      or (subscription_status = 'cancel_at_period_end'
        and pro_expires_at is not null and pro_expires_at <= now())
      or (subscription_status = 'active' and pro_expires_at is not null
        and pro_expires_at <= now())
    );
  changed := changed or found;

  return changed;
end;
$$;

revoke all on function public.admin_create_direct_membership(uuid, text, text, numeric, text, text, integer, text) from public, anon;
grant execute on function public.admin_create_direct_membership(uuid, text, text, numeric, text, text, integer, text) to authenticated, service_role;
revoke all on function public.resolve_eastern_time(timestamp without time zone) from public, anon;
grant execute on function public.resolve_eastern_time(timestamp without time zone) to authenticated, service_role;
revoke all on function public.admin_create_bulk_access_campaign(timestamp without time zone, boolean, text) from public, anon;
grant execute on function public.admin_create_bulk_access_campaign(timestamp without time zone, boolean, text) to authenticated, service_role;
revoke all on function public.refresh_my_subscription_access() from public, anon;
grant execute on function public.refresh_my_subscription_access() to authenticated, service_role;

notify pgrst, 'reload schema';
