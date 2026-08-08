-- Admin-managed EshipX checkout catalog and localized package names.
-- Checkout links are public by nature; no payment credentials are stored here.

alter table public.system_settings
  add column if not exists payment_checkout_urls jsonb not null default '{
    "pro_monthly": "https://eshipx.com/store/onpace/onpacemonthly",
    "pro_yearly": "",
    "founding_member": ""
  }'::jsonb,
  add column if not exists plan_names jsonb not null default '{
    "pro_monthly": {
      "en": "Pro Monthly",
      "tr": "Pro Aylık",
      "es": "Pro Mensual",
      "zh": "Pro 月度版"
    },
    "pro_yearly": {
      "en": "Pro Yearly",
      "tr": "Pro Yıllık",
      "es": "Pro Anual",
      "zh": "Pro 年度版"
    },
    "founding_member": {
      "en": "Founding Member",
      "tr": "Kurucu Üye",
      "es": "Miembro Fundador",
      "zh": "创始会员"
    }
  }'::jsonb;

update public.system_settings
set
  payment_provider = 'eshipx',
  payment_provider_configured = true,
  payment_checkout_urls = jsonb_build_object(
    'pro_monthly', coalesce(nullif(payment_checkout_urls->>'pro_monthly', ''), 'https://eshipx.com/store/onpace/onpacemonthly'),
    'pro_yearly', coalesce(payment_checkout_urls->>'pro_yearly', ''),
    'founding_member', coalesce(payment_checkout_urls->>'founding_member', '')
  ),
  updated_at = now()
where coalesce(payment_provider, 'unconfigured') in ('unconfigured', 'eshipx');

drop function if exists public.get_public_system_settings();
create function public.get_public_system_settings()
returns table (
  payment_gateway_enabled boolean,
  payment_disabled_message jsonb,
  plan_prices jsonb,
  payment_checkout_urls jsonb,
  plan_names jsonb,
  maintenance_mode boolean,
  maintenance_content jsonb,
  legal_documents jsonb,
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
    coalesce(s.payment_checkout_urls, '{}'::jsonb),
    coalesce(s.plan_names, '{}'::jsonb),
    coalesce(s.maintenance_mode, false),
    coalesce(s.maintenance_content, '{}'::jsonb),
    coalesce(s.legal_documents, '{}'::jsonb),
    coalesce(s.payment_provider, 'eshipx'),
    coalesce(s.payment_provider_configured, false),
    coalesce(s.max_failed_payment_attempts, 3),
    coalesce(s.global_grace_days, 3)
  from public.system_settings s
  order by s.id
  limit 1;
$$;

revoke all on function public.get_public_system_settings() from public;
grant execute on function public.get_public_system_settings()
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
