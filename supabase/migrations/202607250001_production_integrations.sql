-- Canonical production hardening for OnPace integrations.
-- Secrets are stored in Supabase Vault and are only readable by service_role.

create extension if not exists supabase_vault with schema vault;

alter table public.system_settings
  add column if not exists payment_gateway_enabled boolean not null default false,
  add column if not exists payment_disabled_message jsonb default '{
    "tr": "Ödemeler şu anda kapalı. Plan değişikliği için yöneticinizle iletişime geçin.",
    "en": "Payments are currently unavailable. Contact your administrator to change your plan.",
    "es": "Los pagos no están disponibles actualmente. Contacta con tu administrador para cambiar de plan.",
    "zh": "付款目前不可用。如需更改套餐，请联系管理员。"
  }'::jsonb,
  add column if not exists plan_prices jsonb default '{"pro_monthly":6.99,"pro_yearly":59.99,"founding_member":99}'::jsonb,
  add column if not exists maintenance_mode boolean not null default false,
  add column if not exists max_failed_payment_attempts integer not null default 3,
  add column if not exists global_grace_days integer not null default 3,
  add column if not exists active_provider text default 'gemini',
  add column if not exists email_from_address text default 'no-reply@onpace-ai.xyz',
  add column if not exists email_from_name text default 'OnPace',
  add column if not exists payment_provider text default 'unconfigured',
  add column if not exists payment_provider_configured boolean default false,
  add column if not exists r2_endpoint text,
  add column if not exists r2_bucket_name text,
  add column if not exists r2_public_url text,
  add column if not exists updated_at timestamptz not null default now();

insert into public.system_settings (payment_gateway_enabled, maintenance_mode)
select false, false
where not exists (select 1 from public.system_settings);

alter table public.profiles
  add column if not exists maintenance_access boolean not null default false,
  add column if not exists language text not null default 'en',
  add column if not exists email text,
  add column if not exists email_notifications_enabled boolean not null default true;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  type text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists title text not null default '',
  add column if not exists content text not null default '',
  add column if not exists type text not null default 'info',
  add column if not exists read boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete using (auth.uid() = user_id);

create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Study Assistant Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_daily (
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create index if not exists idx_ai_chat_sessions_user_updated
  on public.ai_chat_sessions (user_id, updated_at desc);
create index if not exists idx_ai_chat_messages_session_created
  on public.ai_chat_messages (session_id, created_at);

alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;
alter table public.ai_usage_daily enable row level security;
drop policy if exists "ai_chat_sessions_all_own" on public.ai_chat_sessions;
create policy "ai_chat_sessions_all_own" on public.ai_chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "ai_chat_messages_all_own" on public.ai_chat_messages;
create policy "ai_chat_messages_all_own" on public.ai_chat_messages
  for all using (
    exists (
      select 1 from public.ai_chat_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.ai_chat_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
drop policy if exists "ai_usage_select_own" on public.ai_usage_daily;
create policy "ai_usage_select_own" on public.ai_usage_daily
  for select using (auth.uid() = user_id);

create table if not exists public.purchase_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_type text not null,
  billing_cycle text,
  amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.purchase_history enable row level security;
drop policy if exists "purchase_history_select_own" on public.purchase_history;
create policy "purchase_history_select_own" on public.purchase_history
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  previous_plan text,
  next_plan text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.purchase_history
  add column if not exists payment_provider text,
  add column if not exists provider_reference text;

create index if not exists idx_subscription_events_user_created
  on public.subscription_events (user_id, created_at desc);

alter table public.subscription_events enable row level security;
drop policy if exists "subscription_events_select_own" on public.subscription_events;
create policy "subscription_events_select_own" on public.subscription_events
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );
drop policy if exists "subscription_events_admin_insert" on public.subscription_events;
create policy "subscription_events_admin_insert" on public.subscription_events
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
    and created_by = auth.uid()
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, grade_level, language, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'grade_level',
    coalesce(new.raw_user_meta_data->>'language', 'en'),
    new.email
  )
  on conflict (id) do update set
    email = excluded.email,
    language = coalesce(public.profiles.language, excluded.language);
  return new;
end;
$$;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is distinct from u.email;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email, updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.consume_ai_quota()
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
  unlimited_access boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select
    coalesce(p.plan, 'free') in ('pro', 'founding')
    or coalesce(p.role, 'student') in ('admin', 'super_admin')
    or (p.trial_ends_at is not null and p.trial_ends_at > now())
    or (p.pro_expires_at is not null and p.pro_expires_at > now())
  into unlimited_access
  from public.profiles p
  where p.id = auth.uid();

  if coalesce(unlimited_access, false) then
    return query select true, 2147483647;
    return;
  end if;

  insert into public.ai_usage_daily (user_id, usage_date, request_count, updated_at)
  values (auth.uid(), current_date, 1, now())
  on conflict (user_id, usage_date) do update
  set request_count = public.ai_usage_daily.request_count + 1,
      updated_at = now()
  where public.ai_usage_daily.request_count < 5
  returning request_count into current_count;

  if current_count is null then
    return query select false, 0;
  else
    return query select true, greatest(0, 5 - current_count);
  end if;
end;
$$;

create or replace function public.admin_cancel_subscription(
  target_user_id uuid,
  cancellation_note text default null,
  notify_user boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_plan_name text;
  user_language text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Administrator permission required';
  end if;

  select plan, coalesce(language, 'en')
  into previous_plan_name, user_language
  from public.profiles
  where id = target_user_id
  for update;

  if not found then
    raise exception 'User not found';
  end if;

  update public.profiles
  set plan = 'free', pro_expires_at = null
  where id = target_user_id;

  insert into public.subscription_events (
    user_id, event_type, previous_plan, next_plan, note, created_by
  )
  values (
    target_user_id, 'admin_cancelled', previous_plan_name, 'free',
    nullif(trim(cancellation_note), ''), auth.uid()
  );

  if notify_user then
    insert into public.notifications (user_id, title, content, type)
    values (
      target_user_id,
      case user_language
        when 'tr' then 'Abonelik durumu güncellendi'
        when 'es' then 'Estado de suscripción actualizado'
        when 'zh' then '订阅状态已更新'
        else 'Subscription status updated'
      end,
      case user_language
        when 'tr' then 'Planınız bir sistem yöneticisi tarafından iptal edildi.'
        when 'es' then 'Un administrador del sistema canceló tu plan.'
        when 'zh' then '系统管理员已取消您的套餐。'
        else 'Your plan was cancelled by a system administrator.'
      end,
      'alert'
    );
  end if;
end;
$$;

create or replace function public.set_integration_secret(
  secret_name text,
  secret_value text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;
  if secret_name not in (
    'resend_api_key',
    'gemini_api_key',
    'openai_api_key',
    'r2_access_key_id',
    'r2_secret_access_key'
  ) then
    raise exception 'Unsupported secret name';
  end if;
  if nullif(trim(secret_value), '') is null then
    raise exception 'Secret value cannot be empty';
  end if;

  select id into existing_id
  from vault.decrypted_secrets
  where name = secret_name
  limit 1;

  if existing_id is null then
    perform vault.create_secret(secret_value, secret_name, 'Managed by OnPace integration-config');
  else
    perform vault.update_secret(existing_id, secret_value, secret_name, 'Managed by OnPace integration-config');
  end if;
end;
$$;

create or replace function public.get_edge_integration_config()
returns table (
  active_provider text,
  resend_api_key text,
  gemini_api_key text,
  openai_api_key text,
  email_from_address text,
  email_from_name text,
  r2_access_key_id text,
  r2_secret_access_key text,
  r2_endpoint text,
  r2_bucket_name text,
  r2_public_url text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  return query
  select
    coalesce(s.active_provider, 'gemini'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'resend_api_key' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name = 'gemini_api_key' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name = 'openai_api_key' limit 1),
    coalesce(s.email_from_address, 'no-reply@onpace-ai.xyz'),
    coalesce(s.email_from_name, 'OnPace'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'r2_access_key_id' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name = 'r2_secret_access_key' limit 1),
    s.r2_endpoint,
    s.r2_bucket_name,
    s.r2_public_url
  from public.system_settings s
  order by s.id
  limit 1;
end;
$$;

create or replace function public.get_edge_integration_status()
returns table (
  active_provider text,
  has_resend boolean,
  has_gemini boolean,
  has_openai boolean,
  has_r2_access_key boolean,
  has_r2_secret_key boolean,
  email_from_address text,
  email_from_name text,
  r2_endpoint text,
  r2_bucket_name text,
  r2_public_url text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  return query
  select
    coalesce(s.active_provider, 'gemini'),
    exists(select 1 from vault.decrypted_secrets where name = 'resend_api_key' and decrypted_secret <> ''),
    exists(select 1 from vault.decrypted_secrets where name = 'gemini_api_key' and decrypted_secret <> ''),
    exists(select 1 from vault.decrypted_secrets where name = 'openai_api_key' and decrypted_secret <> ''),
    exists(select 1 from vault.decrypted_secrets where name = 'r2_access_key_id' and decrypted_secret <> ''),
    exists(select 1 from vault.decrypted_secrets where name = 'r2_secret_access_key' and decrypted_secret <> ''),
    coalesce(s.email_from_address, 'no-reply@onpace-ai.xyz'),
    coalesce(s.email_from_name, 'OnPace'),
    s.r2_endpoint,
    s.r2_bucket_name,
    s.r2_public_url
  from public.system_settings s
  order by s.id
  limit 1;
end;
$$;

-- The legacy function may expose a different OUT-parameter row type. PostgreSQL
-- cannot change that shape via CREATE OR REPLACE, so rebuild it before exposing
-- the restricted public settings projection below.
drop function if exists public.get_public_system_settings();

create function public.get_public_system_settings()
returns table (
  payment_gateway_enabled boolean,
  payment_disabled_message jsonb,
  plan_prices jsonb,
  maintenance_mode boolean,
  payment_provider text,
  payment_provider_configured boolean,
  max_failed_payment_attempts integer,
  global_grace_days integer
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    coalesce(s.payment_gateway_enabled, false),
    s.payment_disabled_message,
    s.plan_prices,
    coalesce(s.maintenance_mode, false),
    coalesce(s.payment_provider, 'unconfigured'),
    coalesce(s.payment_provider_configured, false),
    coalesce(s.max_failed_payment_attempts, 3),
    coalesce(s.global_grace_days, 3)
  from public.system_settings s
  order by s.id
  limit 1;
$$;

revoke all on function public.set_integration_secret(text, text) from public, anon, authenticated;
revoke all on function public.get_edge_integration_config() from public, anon, authenticated;
revoke all on function public.get_edge_integration_status() from public, anon, authenticated;
grant execute on function public.set_integration_secret(text, text) to service_role;
grant execute on function public.get_edge_integration_config() to service_role;
grant execute on function public.get_edge_integration_status() to service_role;
grant execute on function public.get_public_system_settings() to anon, authenticated, service_role;
revoke all on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated, service_role;
revoke all on function public.admin_cancel_subscription(uuid, text, boolean) from public, anon;
grant execute on function public.admin_cancel_subscription(uuid, text, boolean) to authenticated, service_role;

-- Remove policies that exposed every secret column to browser clients.
drop policy if exists "system_settings_read_all" on public.system_settings;
drop policy if exists "Only admins can select settings" on public.system_settings;
revoke select on public.system_settings from anon, authenticated;

-- Disable the legacy browser-callable functions that bypassed email verification
-- or returned plaintext AI provider keys to authenticated clients.
do $$
begin
  if to_regprocedure('public.update_user_email_direct(text)') is not null then
    execute 'revoke execute on function public.update_user_email_direct(text) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.get_active_ai_config()') is not null then
    execute 'revoke execute on function public.get_active_ai_config() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.get_active_r2_config()') is not null then
    execute 'revoke execute on function public.get_active_r2_config() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.get_system_r2_settings()') is not null then
    execute 'revoke execute on function public.get_system_r2_settings() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.set_system_r2_settings(text,text,text,text,text)') is not null then
    execute 'revoke execute on function public.set_system_r2_settings(text,text,text,text,text) from public, anon, authenticated';
  end if;
end
$$;

-- Existing plaintext integration values are preserved for a controlled rollout,
-- but browsers can no longer read the settings row. Re-enter each secret once in
-- the admin integration screen, then clear the legacy plaintext columns.
