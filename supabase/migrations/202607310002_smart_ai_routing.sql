alter table public.system_settings
  add column if not exists openai_routing_mode text not null default 'smart',
  add column if not exists openai_default_model text not null default 'gpt-5.6-luna';

update public.system_settings
set
  openai_routing_mode = case
    when openai_routing_mode in ('smart', 'single') then openai_routing_mode
    else 'smart'
  end,
  openai_default_model = case
    when openai_default_model in ('gpt-4o-mini', 'gpt-5.6-luna') then openai_default_model
    else 'gpt-5.6-luna'
  end;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'system_settings_openai_routing_mode_check'
      and conrelid = 'public.system_settings'::regclass
  ) then
    alter table public.system_settings
      add constraint system_settings_openai_routing_mode_check
      check (openai_routing_mode in ('smart', 'single'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'system_settings_openai_default_model_check'
      and conrelid = 'public.system_settings'::regclass
  ) then
    alter table public.system_settings
      add constraint system_settings_openai_default_model_check
      check (openai_default_model in ('gpt-4o-mini', 'gpt-5.6-luna'));
  end if;
end
$$;

create or replace function public.get_ai_model_settings()
returns table (
  openai_routing_mode text,
  openai_default_model text
)
language sql
security definer
set search_path = ''
as $$
  select
    coalesce(s.openai_routing_mode, 'smart'),
    coalesce(s.openai_default_model, 'gpt-5.6-luna')
  from public.system_settings s
  order by s.id
  limit 1;
$$;

revoke all on function public.get_ai_model_settings() from public, anon, authenticated;
grant execute on function public.get_ai_model_settings() to service_role;
