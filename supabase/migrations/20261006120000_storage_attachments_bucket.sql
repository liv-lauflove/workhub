-- =====================================================================
-- Migration: Attachments Storage Bucket & RLS Configuration
-- Issue #36: [Storage] Konfigurasi Bucket Attachment
-- =====================================================================

-- 1. Create or update 'attachments' bucket in storage.buckets
--    - Private bucket (public = false): requires auth token or signed URL to access
--    - File size limit: 10MB (10485760 bytes)
--    - Allowed MIME types: PDF, JPG, PNG, WEBP (configured at server level)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage Row Level Security (RLS) on storage.objects

-- 2a. SELECT / READ Policy:
--     Allow authenticated users to read/download attachments
drop policy if exists "attachments_read_authenticated" on storage.objects;
create policy "attachments_read_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'attachments');

-- 2b. INSERT / UPLOAD Policy:
--     Allow authenticated users to upload files to the attachments bucket
drop policy if exists "attachments_upload_authenticated" on storage.objects;
create policy "attachments_upload_authenticated"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
  );

-- 2c. UPDATE Policy:
--     Allow users to update objects they uploaded
drop policy if exists "attachments_update_owner" on storage.objects;
create policy "attachments_update_owner"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'attachments' and (select auth.uid()) = owner)
  with check (bucket_id = 'attachments' and (select auth.uid()) = owner);

-- 2d. DELETE Policy:
--     Allow file owner OR leaders to delete attachments
drop policy if exists "attachments_delete_owner_or_leader" on storage.objects;
create policy "attachments_delete_owner_or_leader"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and (
      (select auth.uid()) = owner
      or exists (
        select 1 from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role = 'leader'
      )
    )
  );
