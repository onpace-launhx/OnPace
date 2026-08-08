-- Atomic bulk access operations callable by an authenticated billing admin.
-- These functions provide a safe fallback when the subscription Edge Function
-- is not published yet. They never delete learning data.

create or replace function public.admin_create_bulk_access_preview(
  p_mode text,
  p_target_plan text,
  p_confirmation_hash text,
  p_ends_at_eastern timestamp without time zone,
  p_auto_assign_new_users boolean
)
returns table (
  operation_id uuid,
  preview_count integer,
  ends_at_utc timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_operation_id uuid := gen_random_uuid();
  matched_count integer := 0;
  resolved_end timestamptz := null;
  effective_target text := case when p_mode = 'grant' then 'free' else p_target_plan end;
begin
  if not public.can_manage_billing(auth.uid()) then
    raise exception 'Billing administrator permission required';
  end if;
  if p_mode not in ('reset', 'grant') then raise exception 'Invalid bulk operation'; end if;
  if effective_target not in ('all', 'free', 'pro', 'founding') then raise exception 'Invalid target filter'; end if;
  if p_confirmation_hash is null or char_length(p_confirmation_hash) <> 64 then
    raise exception 'Invalid preview confirmation';
  end if;

  if p_mode = 'grant' then
    if p_ends_at_eastern is null then raise exception 'A campaign end time is required'; end if;
    resolved_end := p_ends_at_eastern at time zone 'America/New_York';
    if resolved_end <= now() then raise exception 'Campaign end must be in the future'; end if;
  end if;

  select count(*)::integer into matched_count
  from public.profiles p
  where p.role = 'student'
    and (effective_target = 'all' or p.plan = effective_target);

  insert into public.bulk_plan_operations (
    id, requested_by, action, target_filter, preview_count,
    confirmation_hash, status, expires_at
  ) values (
    new_operation_id,
    auth.uid(),
    case when p_mode = 'grant' then 'start_trial' else 'reset_to_free' end,
    jsonb_build_object(
      'plan', effective_target,
      'mode', p_mode,
      'ends_at_eastern', case when p_mode = 'grant' then p_ends_at_eastern else null end,
      'ends_at_utc', resolved_end,
      'auto_assign_new_users', p_mode = 'grant' and coalesce(p_auto_assign_new_users, false)
    ),
    matched_count,
    p_confirmation_hash,
    'preview',
    now() + interval '10 minutes'
  );

  return query select new_operation_id, matched_count, resolved_end;
end;
$$;

create or replace function public.admin_execute_bulk_access_operation(
  p_operation_id uuid,
  p_confirmation_hash text,
  p_confirmation_text text
)
returns table (
  affected_count integer,
  campaign_id uuid,
  ends_at_utc timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation public.bulk_plan_operations%rowtype;
  effective_target text;
  matched_count integer := 0;
  expected_confirmation text;
  created_campaign_id uuid := null;
  created_campaign_end timestamptz := null;
  campaign_affected integer := 0;
begin
  if not public.can_manage_billing(auth.uid()) then
    raise exception 'Billing administrator permission required';
  end if;

  select o.* into operation
  from public.bulk_plan_operations o
  where o.id = p_operation_id
    and o.requested_by = auth.uid()
  for update;

  if operation.id is null then raise exception 'Bulk preview not found'; end if;
  if operation.status <> 'preview' or operation.expires_at <= now() then
    raise exception 'Bulk preview expired; create a new preview';
  end if;
  if operation.confirmation_hash <> p_confirmation_hash then
    raise exception 'Bulk preview confirmation is invalid';
  end if;

  expected_confirmation := case
    when operation.action = 'start_trial' then 'GRANT ' || operation.preview_count || ' PLANS'
    else 'RESET ' || operation.preview_count || ' PLANS'
  end;
  if p_confirmation_text <> expected_confirmation then
    raise exception 'Confirmation text does not match';
  end if;

  effective_target := coalesce(operation.target_filter->>'plan', 'all');
  select count(*)::integer into matched_count
  from public.profiles p
  where p.role = 'student'
    and (effective_target = 'all' or p.plan = effective_target);
  if matched_count <> operation.preview_count then
    raise exception 'Target count changed; create a new preview';
  end if;

  if operation.action = 'start_trial' then
    if effective_target <> 'free' then
      raise exception 'Complimentary Pro access can only be granted to Free accounts';
    end if;

    select c.campaign_id, c.affected_count, c.ends_at_utc
      into created_campaign_id, campaign_affected, created_campaign_end
    from public.admin_create_bulk_access_campaign(
      (operation.target_filter->>'ends_at_eastern')::timestamp without time zone,
      coalesce((operation.target_filter->>'auto_assign_new_users')::boolean, false),
      'free'
    ) c;

    update public.bulk_plan_operations
    set status = 'completed', affected_count = campaign_affected, executed_at = now()
    where id = operation.id;

    return query select campaign_affected, created_campaign_id, created_campaign_end;
    return;
  end if;

  -- Stop old automatic complimentary campaigns before resetting everyone.
  if effective_target = 'all' then
    update public.bulk_access_campaigns
    set status = 'canceled', auto_assign_new_users = false, updated_at = now()
    where status = 'active';
  end if;

  insert into public.subscription_events (
    user_id, event_type, previous_plan, next_plan, note, metadata, created_by
  )
  select p.id, 'bulk_plan_reset_to_free', p.plan, 'free',
    'Plan and subscription fields reset; all learning data preserved.',
    jsonb_build_object('operation_id', operation.id), auth.uid()
  from public.profiles p
  where p.role = 'student'
    and (effective_target = 'all' or p.plan = effective_target);

  update public.manual_subscriptions s
  set status = 'canceled', cancel_at_period_end = false,
      canceled_at = now(), cancellation_effective_at = now(),
      next_renewal_at = null, updated_by = auth.uid(), updated_at = now()
  where s.status in ('pending_activation', 'active', 'cancel_at_period_end')
    and exists (
      select 1 from public.profiles p
      where p.id = s.user_id and p.role = 'student'
        and (effective_target = 'all' or p.plan = effective_target)
    );

  insert into public.notifications (user_id, title, content, type)
  select p.id,
    case coalesce(p.language, 'en')
      when 'tr' then 'Paketiniz Ücretsiz olarak güncellendi'
      when 'es' then 'Tu plan se actualizó a Gratuito'
      when 'zh' then '您的套餐已更新为免费版'
      else 'Your plan was updated to Free'
    end,
    case coalesce(p.language, 'en')
      when 'tr' then 'Yöneticiniz aboneliğinizi iptal ederek hesabınızı Ücretsiz pakete aldı. Notlarınız, görevleriniz, takviminiz, sohbetleriniz ve çalışma verileriniz korunmuştur.'
      when 'es' then 'Un administrador canceló tu suscripción y movió tu cuenta al plan Gratuito. Tus notas, tareas, calendario, chats y datos de estudio se conservaron.'
      when 'zh' then '管理员已取消您的订阅并将账户转为免费套餐。您的笔记、任务、日历、聊天和学习数据均已保留。'
      else 'An administrator canceled your subscription and moved your account to Free. Your notes, tasks, calendar, chats, and learning data were preserved.'
    end,
    'info'
  from public.profiles p
  where p.role = 'student'
    and (effective_target = 'all' or p.plan = effective_target);

  update public.profiles p
  set plan = 'free', subscription_status = 'none', billing_cycle = 'none',
      trial_start_at = null, trial_ends_at = null, pro_expires_at = null,
      next_billing_date = null, active_promocode = null,
      promocode_expires_at = null, discount_percent = 0,
      complimentary_campaign_id = null, updated_at = now()
  where p.role = 'student'
    and (effective_target = 'all' or p.plan = effective_target);

  update public.bulk_plan_operations
  set status = 'completed', affected_count = matched_count, executed_at = now()
  where id = operation.id;

  return query select matched_count, null::uuid, null::timestamptz;
end;
$$;

revoke all on function public.admin_create_bulk_access_preview(text, text, text, timestamp without time zone, boolean) from public, anon;
grant execute on function public.admin_create_bulk_access_preview(text, text, text, timestamp without time zone, boolean) to authenticated, service_role;
revoke all on function public.admin_execute_bulk_access_operation(uuid, text, text) from public, anon;
grant execute on function public.admin_execute_bulk_access_operation(uuid, text, text) to authenticated, service_role;

notify pgrst, 'reload schema';
