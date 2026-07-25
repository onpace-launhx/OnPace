-- Keeps screenshot delivery failures visible to administrators without showing
-- infrastructure details to the reporting user.
alter table public.bug_reports
  add column if not exists screenshot_status text not null default 'not_captured',
  add column if not exists screenshot_error text;

alter table public.bug_reports
  drop constraint if exists bug_reports_screenshot_status_check;

alter table public.bug_reports
  add constraint bug_reports_screenshot_status_check
  check (screenshot_status in ('not_captured', 'uploaded', 'upload_failed'));

-- The admin console manages report lifecycle. This policy deliberately limits
-- destructive actions to full administrators; reporters never receive access
-- to another user's report.
alter table public.bug_reports enable row level security;
drop policy if exists "bug_reports_delete_admins" on public.bug_reports;
create policy "bug_reports_delete_admins" on public.bug_reports
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role in ('admin', 'super_admin')
    )
  );
