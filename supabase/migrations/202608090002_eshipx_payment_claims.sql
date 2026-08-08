-- User-submitted EshipX payment claims and atomic administrator approval.
-- No learning content is changed by this migration.

-- Early production databases may already contain purchase_history with only
-- part of the billing columns. CREATE TABLE IF NOT EXISTS cannot repair an
-- existing table, so make the required shape explicit before backfilling it.
alter table public.purchase_history
  add column if not exists billing_cycle text,
  add column if not exists amount numeric(12, 2) not null default 0,
  add column if not exists currency text not null default 'USD',
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists payment_provider text,
  add column if not exists provider_reference text;

create table if not exists public.eshipx_payment_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  plan_type text not null check (plan_type in ('pro_monthly', 'pro_yearly', 'founding_member')),
  plan text not null check (plan in ('pro', 'founding')),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly', 'one_time')),
  payer_email text not null check (char_length(trim(payer_email)) between 5 and 254),
  quoted_amount numeric(12, 2) not null check (quoted_amount > 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  provider text not null default 'eshipx' check (provider = 'eshipx'),
  provider_reference text,
  status text not null default 'submitted' check (
    status in ('submitted', 'reviewing', 'approved', 'rejected', 'canceled')
  ),
  customer_note text,
  admin_note text,
  subscription_id uuid references public.manual_subscriptions(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists eshipx_payment_claims_open_user_idx
  on public.eshipx_payment_claims (user_id)
  where status in ('submitted', 'reviewing');
create unique index if not exists eshipx_payment_claims_reference_idx
  on public.eshipx_payment_claims (provider, provider_reference)
  where provider_reference is not null and provider_reference <> '';
create index if not exists eshipx_payment_claims_admin_queue_idx
  on public.eshipx_payment_claims (status, submitted_at desc);
create index if not exists eshipx_payment_claims_payer_email_idx
  on public.eshipx_payment_claims (lower(payer_email));

alter table public.eshipx_payment_claims enable row level security;

drop policy if exists "payment_claims_select_own_or_billing_admin" on public.eshipx_payment_claims;
create policy "payment_claims_select_own_or_billing_admin"
  on public.eshipx_payment_claims for select
  using (auth.uid() = user_id or public.can_manage_billing(auth.uid()));

-- Permanent ledger for every EshipX charge. A reference can be used only once,
-- including later renewals, even when a subscription record is updated.
create table if not exists public.eshipx_payment_references (
  id uuid primary key default gen_random_uuid(),
  provider_reference text not null check (char_length(trim(provider_reference)) between 3 and 160),
  user_id uuid not null references public.profiles(id) on delete restrict,
  payment_claim_id uuid references public.eshipx_payment_claims(id) on delete restrict,
  subscription_id uuid references public.manual_subscriptions(id) on delete restrict,
  transaction_type text not null check (transaction_type in ('activation', 'renewal', 'historical')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (char_length(currency) = 3),
  recorded_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists eshipx_payment_references_unique_idx
  on public.eshipx_payment_references (lower(provider_reference));
create unique index if not exists eshipx_payment_references_claim_idx
  on public.eshipx_payment_references (payment_claim_id)
  where payment_claim_id is not null;
create index if not exists eshipx_payment_references_user_created_idx
  on public.eshipx_payment_references (user_id, created_at desc);

alter table public.eshipx_payment_references enable row level security;
drop policy if exists "eshipx_references_select_own_or_billing_admin" on public.eshipx_payment_references;
create policy "eshipx_references_select_own_or_billing_admin"
  on public.eshipx_payment_references for select
  using (auth.uid() = user_id or public.can_manage_billing(auth.uid()));

-- Reserve references already present in older manual records before this flow
-- was introduced, without changing those records.
insert into public.eshipx_payment_references (
  provider_reference, user_id, subscription_id, transaction_type,
  amount, currency, recorded_by, created_at
)
select trim(m.provider_reference), m.user_id, m.id, 'historical', m.amount,
  upper(m.currency), m.created_by, m.created_at
from public.manual_subscriptions m
where lower(m.provider) = 'eshipx'
  and nullif(trim(m.provider_reference), '') is not null
  and m.amount > 0
on conflict do nothing;

insert into public.eshipx_payment_references (
  provider_reference, user_id, transaction_type, amount, currency, created_at
)
select trim(p.provider_reference), p.user_id, 'historical', p.amount,
  upper(p.currency), p.created_at
from public.purchase_history p
where lower(coalesce(p.payment_provider, '')) = 'eshipx'
  and nullif(trim(p.provider_reference), '') is not null
  and p.amount > 0
on conflict do nothing;

create or replace function public.admin_approve_eshipx_payment_claim(
  p_claim_id uuid,
  p_provider_reference text,
  p_amount numeric default null,
  p_currency text default null,
  p_period_start timestamptz default now(),
  p_admin_note text default null
)
returns table (
  subscription_id uuid,
  approved_user_id uuid,
  approved_plan text,
  approved_cycle text,
  approved_amount numeric,
  approved_currency text,
  approved_period_end timestamptz,
  approved_next_renewal timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim public.eshipx_payment_claims%rowtype;
  new_subscription_id uuid;
  effective_amount numeric(12, 2);
  effective_currency text;
  period_end_value timestamptz;
  reference_value text := trim(coalesce(p_provider_reference, ''));
begin
  if not public.can_manage_billing(auth.uid()) then
    raise exception 'Billing administrator permission required';
  end if;
  if char_length(reference_value) < 3 or char_length(reference_value) > 160 then
    raise exception 'A valid EshipX payment reference is required';
  end if;

  select * into claim
  from public.eshipx_payment_claims
  where id = p_claim_id
  for update;

  if claim.id is null then raise exception 'Payment claim not found'; end if;
  if claim.status not in ('submitted', 'reviewing') then
    raise exception 'This payment claim has already been reviewed';
  end if;
  if exists (
    select 1 from public.manual_subscriptions s
    where s.user_id = claim.user_id and s.status in ('active', 'cancel_at_period_end', 'pending_activation')
  ) then
    raise exception 'This account already has an open manual subscription; renew or close it first';
  end if;
  if exists (
    select 1 from public.manual_subscriptions s
    where s.provider = 'eshipx' and s.provider_reference = reference_value
  ) or exists (
    select 1 from public.eshipx_payment_references r
    where lower(r.provider_reference) = lower(reference_value)
  ) or exists (
    select 1 from public.eshipx_payment_claims c
    where c.provider = 'eshipx' and c.provider_reference = reference_value and c.id <> claim.id
  ) then
    raise exception 'This EshipX payment reference is already in use';
  end if;

  effective_amount := coalesce(p_amount, claim.quoted_amount);
  effective_currency := upper(coalesce(nullif(trim(p_currency), ''), claim.currency));
  if effective_amount <= 0 then raise exception 'Payment amount must be greater than zero'; end if;
  if char_length(effective_currency) <> 3 then raise exception 'Currency must use a 3-letter code'; end if;

  period_end_value := case
    when claim.billing_cycle = 'monthly' then p_period_start + interval '1 month'
    when claim.billing_cycle = 'yearly' then p_period_start + interval '1 year'
    else null
  end;

  insert into public.manual_subscriptions (
    user_id, plan, provider, provider_reference, amount, currency, billing_cycle,
    status, period_start, period_end, next_renewal_at, internal_note,
    created_by, updated_by, activated_at, activated_by
  ) values (
    claim.user_id, claim.plan, 'eshipx', reference_value, effective_amount,
    effective_currency, claim.billing_cycle, 'active', p_period_start,
    period_end_value, period_end_value, nullif(trim(coalesce(p_admin_note, '')), ''),
    auth.uid(), auth.uid(), now(), auth.uid()
  ) returning id into new_subscription_id;

  insert into public.eshipx_payment_references (
    provider_reference, user_id, payment_claim_id, subscription_id,
    transaction_type, amount, currency, recorded_by
  ) values (
    reference_value, claim.user_id, claim.id, new_subscription_id,
    'activation', effective_amount, effective_currency, auth.uid()
  );

  update public.eshipx_payment_claims set
    status = 'approved', provider_reference = reference_value,
    quoted_amount = effective_amount, currency = effective_currency,
    admin_note = nullif(trim(coalesce(p_admin_note, '')), ''),
    subscription_id = new_subscription_id, reviewed_at = now(),
    reviewed_by = auth.uid(), updated_at = now()
  where id = claim.id;

  update public.profiles set
    plan = claim.plan,
    subscription_status = 'active',
    billing_cycle = case when claim.billing_cycle = 'one_time' then 'lifetime' else claim.billing_cycle end,
    trial_start_at = null,
    trial_ends_at = null,
    pro_expires_at = case when claim.billing_cycle = 'one_time' then null else period_end_value end,
    next_billing_date = period_end_value,
    updated_at = now()
  where id = claim.user_id;

  insert into public.purchase_history (
    user_id, plan_type, billing_cycle, amount, currency, status,
    payment_provider, provider_reference
  ) values (
    claim.user_id, claim.plan_type, claim.billing_cycle, effective_amount,
    effective_currency, 'completed', 'eshipx', reference_value
  );

  insert into public.subscription_events (
    user_id, event_type, previous_plan, next_plan, note, metadata, created_by
  ) values (
    claim.user_id, 'eshipx_payment_claim_approved', null, claim.plan,
    'EshipX payment matched and activated by billing administrator.',
    jsonb_build_object(
      'claim_id', claim.id,
      'subscription_id', new_subscription_id,
      'provider_reference', reference_value,
      'payer_email', claim.payer_email,
      'amount', effective_amount,
      'currency', effective_currency
    ),
    auth.uid()
  );

  return query select new_subscription_id, claim.user_id, claim.plan,
    claim.billing_cycle, effective_amount, effective_currency,
    period_end_value, period_end_value;
end;
$$;

create or replace function public.admin_renew_eshipx_subscription(
  p_subscription_id uuid,
  p_provider_reference text,
  p_amount numeric default null,
  p_currency text default null,
  p_period_end timestamptz default null,
  p_admin_note text default null
)
returns table (
  renewed_subscription_id uuid,
  renewed_user_id uuid,
  renewed_plan text,
  renewed_cycle text,
  renewed_amount numeric,
  renewed_currency text,
  renewed_period_end timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscription public.manual_subscriptions%rowtype;
  reference_value text := trim(coalesce(p_provider_reference, ''));
  effective_cycle text;
  effective_amount numeric(12, 2);
  effective_currency text;
  period_start_value timestamptz;
  period_end_value timestamptz;
  purchase_plan_type text;
begin
  if not public.can_manage_billing(auth.uid()) then
    raise exception 'Billing administrator permission required';
  end if;
  if char_length(reference_value) < 3 or char_length(reference_value) > 160 then
    raise exception 'A new unique EshipX payment reference is required';
  end if;

  select * into subscription
  from public.manual_subscriptions
  where id = p_subscription_id
  for update;

  if subscription.id is null then raise exception 'Subscription not found'; end if;
  if subscription.status not in ('active', 'cancel_at_period_end', 'expired') then
    raise exception 'This subscription cannot be renewed';
  end if;

  effective_cycle := case
    when subscription.billing_cycle = 'trial' then coalesce(subscription.renewal_cycle, 'monthly')
    else subscription.billing_cycle
  end;
  if effective_cycle not in ('monthly', 'yearly') then
    raise exception 'Only monthly or yearly subscriptions can be renewed';
  end if;

  effective_amount := coalesce(p_amount, subscription.amount);
  effective_currency := upper(coalesce(nullif(trim(p_currency), ''), subscription.currency));
  if effective_amount <= 0 then raise exception 'Payment amount must be greater than zero'; end if;
  if char_length(effective_currency) <> 3 then raise exception 'Currency must use a 3-letter code'; end if;

  period_start_value := case
    when subscription.period_end is not null and subscription.period_end > now() then subscription.period_end
    else now()
  end;
  period_end_value := coalesce(
    p_period_end,
    case when effective_cycle = 'yearly'
      then period_start_value + interval '1 year'
      else period_start_value + interval '1 month'
    end
  );
  if period_end_value <= period_start_value then
    raise exception 'Renewal end must be after the renewal start';
  end if;

  insert into public.eshipx_payment_references (
    provider_reference, user_id, subscription_id, transaction_type,
    amount, currency, recorded_by
  ) values (
    reference_value, subscription.user_id, subscription.id, 'renewal',
    effective_amount, effective_currency, auth.uid()
  );

  update public.manual_subscriptions set
    status = 'active', amount = effective_amount, currency = effective_currency,
    billing_cycle = effective_cycle, period_start = period_start_value,
    period_end = period_end_value, next_renewal_at = period_end_value,
    cancel_at_period_end = false, canceled_at = null,
    cancellation_effective_at = null,
    internal_note = coalesce(nullif(trim(coalesce(p_admin_note, '')), ''), internal_note),
    updated_by = auth.uid(), updated_at = now()
  where id = subscription.id;

  update public.profiles set
    plan = subscription.plan, subscription_status = 'active',
    billing_cycle = effective_cycle, trial_start_at = null, trial_ends_at = null,
    pro_expires_at = period_end_value, next_billing_date = period_end_value,
    updated_at = now()
  where id = subscription.user_id;

  purchase_plan_type := case
    when subscription.plan = 'founding' then 'founding_member'
    when effective_cycle = 'yearly' then 'pro_yearly'
    else 'pro_monthly'
  end;
  insert into public.purchase_history (
    user_id, plan_type, billing_cycle, amount, currency, status,
    payment_provider, provider_reference
  ) values (
    subscription.user_id, purchase_plan_type, effective_cycle,
    effective_amount, effective_currency, 'completed', 'eshipx', reference_value
  );

  insert into public.subscription_events (
    user_id, event_type, previous_plan, next_plan, note, metadata, created_by
  ) values (
    subscription.user_id, 'eshipx_subscription_renewed', subscription.plan,
    subscription.plan, 'EshipX renewal matched by billing administrator.',
    jsonb_build_object(
      'subscription_id', subscription.id,
      'provider_reference', reference_value,
      'amount', effective_amount,
      'currency', effective_currency,
      'period_end', period_end_value
    ),
    auth.uid()
  );

  return query select subscription.id, subscription.user_id, subscription.plan,
    effective_cycle, effective_amount, effective_currency, period_end_value;
end;
$$;

revoke all on function public.admin_approve_eshipx_payment_claim(uuid, text, numeric, text, timestamptz, text) from public, anon;
grant execute on function public.admin_approve_eshipx_payment_claim(uuid, text, numeric, text, timestamptz, text) to authenticated, service_role;
revoke all on function public.admin_renew_eshipx_subscription(uuid, text, numeric, text, timestamptz, text) from public, anon;
grant execute on function public.admin_renew_eshipx_subscription(uuid, text, numeric, text, timestamptz, text) to authenticated, service_role;
