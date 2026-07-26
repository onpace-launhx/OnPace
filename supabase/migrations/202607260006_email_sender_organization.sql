-- Separate administrative announcements from authentication/security mail.
-- Edge Functions enforce the security sender independently; this migration
-- updates the persisted announcement sender for existing installations.

alter table public.system_settings
  alter column email_from_address
  set default 'no-reply@onpace-ai.xyz';

update public.system_settings
set
  email_from_address = 'no-reply@onpace-ai.xyz',
  updated_at = now()
where
  email_from_address is null
  or lower(email_from_address) in (
    'noreply@onpace.app',
    'noreply@onpace-ai.xyz',
    'no-reply@onpace.app'
  );

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

revoke all on function public.get_edge_integration_config() from public, anon, authenticated;
revoke all on function public.get_edge_integration_status() from public, anon, authenticated;
grant execute on function public.get_edge_integration_config() to service_role;
grant execute on function public.get_edge_integration_status() to service_role;
