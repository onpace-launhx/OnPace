-- Server-enforced maintenance mode with editable localized content.

alter table public.system_settings
  add column if not exists maintenance_content jsonb not null default '{
    "en": {
      "badge": "Scheduled upgrade in progress",
      "title": "We are improving OnPace",
      "description": "We are performing planned maintenance to make your study experience faster and more reliable.",
      "coming_title": "Coming with this update",
      "coming_items": [],
      "back_soon": "We will be back shortly."
    },
    "tr": {
      "badge": "Planlı güncelleme devam ediyor",
      "title": "OnPace’i geliştiriyoruz",
      "description": "Çalışma deneyiminizi daha hızlı ve güvenilir hale getirmek için planlı bakım yapıyoruz.",
      "coming_title": "Bu güncellemeyle gelecekler",
      "coming_items": [],
      "back_soon": "Kısa süre içinde tekrar buradayız."
    },
    "es": {
      "badge": "Actualización programada en curso",
      "title": "Estamos mejorando OnPace",
      "description": "Realizamos mantenimiento programado para que tu experiencia de estudio sea más rápida y fiable.",
      "coming_title": "Novedades de esta actualización",
      "coming_items": [],
      "back_soon": "Volveremos muy pronto."
    },
    "zh": {
      "badge": "计划更新正在进行",
      "title": "我们正在改进 OnPace",
      "description": "我们正在进行计划维护，让您的学习体验更快速、更可靠。",
      "coming_title": "本次更新内容",
      "coming_items": [],
      "back_soon": "我们很快回来。"
    }
  }'::jsonb;

drop function if exists public.get_public_system_settings();
create function public.get_public_system_settings()
returns table (
  payment_gateway_enabled boolean,
  payment_disabled_message jsonb,
  plan_prices jsonb,
  maintenance_mode boolean,
  maintenance_content jsonb,
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
    coalesce(s.payment_provider, 'unconfigured'),
    coalesce(s.payment_provider_configured, false),
    coalesce(s.max_failed_payment_attempts, 3),
    coalesce(s.global_grace_days, 3)
  from public.system_settings s
  order by s.id
  limit 1;
$$;

create or replace function public.admin_update_maintenance_settings(
  p_enabled boolean,
  p_content jsonb
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

  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'Maintenance content must be a JSON object';
  end if;

  update public.system_settings
  set
    maintenance_mode = coalesce(p_enabled, false),
    maintenance_content = p_content,
    updated_at = now()
  where id = (
    select id from public.system_settings order by id limit 1
  );

  if not found then
    insert into public.system_settings (
      maintenance_mode,
      maintenance_content
    ) values (
      coalesce(p_enabled, false),
      p_content
    );
  end if;
end;
$$;

revoke all on function public.get_public_system_settings() from public;
grant execute on function public.get_public_system_settings()
  to anon, authenticated, service_role;

revoke all on function public.admin_update_maintenance_settings(boolean, jsonb)
  from public, anon;
grant execute on function public.admin_update_maintenance_settings(boolean, jsonb)
  to authenticated, service_role;

notify pgrst, 'reload schema';
