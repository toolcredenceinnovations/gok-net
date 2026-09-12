-- ============================================================================
-- GOK-NET — private attachment storage
--
-- Files are never served directly. The bucket is private; the app hands out
-- short-lived signed URLs. Path convention (first segment is always the site,
-- which is what the policies key off):
--   {site_id}/expenses/{expense_id}/{uuid}.{ext}
--   {site_id}/payments/{payment_id}/{uuid}.{ext}
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- Members of a site can read that site's files. The first path segment is the
-- site_id, so this is a cheap prefix check against the caller's active site.
create policy "site members read attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = current_user_site_id()::text
);

-- Members, admins and owners can upload into their own site's prefix.
-- Viewers cannot.
create policy "members upload attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = current_user_site_id()::text
  and current_user_has_role('owner', 'admin', 'member')
);

-- Deliberately no update or delete policy. Attachments are evidence — the
-- same reasoning as void-never-delete. Removing one requires the service role.
