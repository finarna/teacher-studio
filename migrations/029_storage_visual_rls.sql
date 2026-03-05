-- ============================================================
-- Migration: 029_storage_visual_rls.sql
-- Description: Adds Supabase Storage bucket + RLS policies for
--              visual scan assets (question sketches / diagrams).
--              The server already uses the service_role key to
--              upload via the server-side fallback path, so the
--              primary goal of the browser-side policy is to
--              silence the RLS error and enable direct uploads
--              when the client is authenticated.
-- ============================================================

-- 1. Create the edujourney-images storage bucket (idempotent)
-- NOTE: Run this in Supabase SQL Editor (requires storage schema access).
-- If the bucket already exists this is a no-op.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'edujourney-images',
  'edujourney-images',
  true,                          -- public so getPublicUrl() works without signed URLs
  20971520,                      -- 20 MB per file limit
  ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS: allow authenticated users to INSERT (upload) their own files
--    Path convention: sketches/{userId}/{scanId}/{filename}
--    The check on (storage.foldername(name))[1] = auth.uid()::text ensures
--    users can only write into their own folder.
DROP POLICY IF EXISTS "Authenticated users can upload own sketches" ON storage.objects;
CREATE POLICY "Authenticated users can upload own sketches"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'edujourney-images'
    AND (storage.foldername(name))[1] = 'sketches'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 3. Storage RLS: allow public read of all objects in this bucket
--    (bucket is already public, but explicit policy prevents confusion)
DROP POLICY IF EXISTS "Public read for edujourney-images" ON storage.objects;
CREATE POLICY "Public read for edujourney-images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'edujourney-images');

-- 4. Storage RLS: allow authenticated users to update/delete their own objects
DROP POLICY IF EXISTS "Authenticated users can manage own sketches" ON storage.objects;
CREATE POLICY "Authenticated users can manage own sketches"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'edujourney-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'edujourney-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- SETUP INSTRUCTIONS (one-time, per Supabase project)
-- ============================================================
-- 1. Run this entire file in Supabase SQL Editor.
-- 2. Go to Supabase Dashboard > Storage and confirm the
--    "edujourney-images" bucket appears with "Public" badge.
-- 3. Under Storage > Policies you should see three new policies
--    on storage.objects for this bucket.
-- 4. The server-side upload path (server-supabase.js) uses the
--    service_role key and bypasses RLS entirely — it will work
--    regardless. The policies above silence the browser-side
--    RLS error and enable optional direct client uploads.
-- ============================================================
