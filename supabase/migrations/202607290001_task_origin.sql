-- Keep student-created tasks separate from AI study-plan suggestions while
-- preserving AI breakdown steps as children of their original task.

alter table public.tasks
  add column if not exists task_origin text not null default 'manual';

update public.tasks
set task_origin = 'ai_breakdown'
where parent_id is not null
  and task_origin = 'manual';

alter table public.tasks
  drop constraint if exists tasks_task_origin_check;

alter table public.tasks
  add constraint tasks_task_origin_check
  check (task_origin in ('manual', 'ai_schedule', 'ai_breakdown'));

create index if not exists tasks_user_origin_status_due_idx
  on public.tasks (user_id, task_origin, status, due_date);
