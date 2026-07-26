-- Editable public Privacy Policy and Terms of Service content.

alter table public.system_settings
  add column if not exists legal_documents jsonb not null default '{}'::jsonb;

drop function if exists public.get_public_system_settings();
create function public.get_public_system_settings()
returns table (
  payment_gateway_enabled boolean,
  payment_disabled_message jsonb,
  plan_prices jsonb,
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
    coalesce(s.maintenance_mode, false),
    coalesce(s.maintenance_content, '{}'::jsonb),
    coalesce(s.legal_documents, '{}'::jsonb),
    coalesce(s.payment_provider, 'unconfigured'),
    coalesce(s.payment_provider_configured, false),
    coalesce(s.max_failed_payment_attempts, 3),
    coalesce(s.global_grace_days, 3)
  from public.system_settings s
  order by s.id
  limit 1;
$$;

create or replace function public.admin_update_legal_documents(
  p_documents jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  can_manage boolean;
begin
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or (
          p.role = 'admin'
          and coalesce(to_jsonb(p.permissions) ? 'manage_settings', false)
        )
      )
  ) into can_manage;

  if not can_manage then
    raise exception 'Forbidden';
  end if;

  if p_documents is null or jsonb_typeof(p_documents) <> 'object' then
    raise exception 'Legal documents must be a JSON object';
  end if;

  if length(p_documents::text) > 250000 then
    raise exception 'Legal documents are too large';
  end if;

  update public.system_settings
  set legal_documents = p_documents, updated_at = now()
  where id = (
    select id from public.system_settings order by id limit 1
  );

  if not found then
    insert into public.system_settings (legal_documents)
    values (p_documents);
  end if;
end;
$$;

revoke all on function public.get_public_system_settings() from public;
grant execute on function public.get_public_system_settings()
  to anon, authenticated, service_role;

revoke all on function public.admin_update_legal_documents(jsonb)
  from public, anon;
grant execute on function public.admin_update_legal_documents(jsonb)
  to authenticated, service_role;

notify pgrst, 'reload schema';
