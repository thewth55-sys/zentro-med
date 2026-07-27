-- ============================================================
-- 070_visit_files_expand_types.sql — the "Fotos" tab becomes
-- "Archivos": besides clinical photos, staff can now attach PDFs and
-- Word documents (signed consent forms, referral letters, lab
-- results) to a patient, each with an optional note.
--
-- `visit_photos` and the `clinical-photos` bucket keep their original
-- names — renaming either is a much bigger, riskier change (storage
-- objects, RLS policy names, every call site) for what is purely a UI
-- relabel plus a widened file-type allowlist. `file_name` is stored
-- explicitly rather than parsed back out of `storage_path` so the UI
-- can show the original filename for non-image files, which have no
-- thumbnail to fall back on.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE visit_photos
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS content_type text;

UPDATE storage.buckets
SET
  file_size_limit = 15728640, -- 15 MB — scanned consent forms run larger than a phone photo
  allowed_mime_types = ARRAY[
    'image/png', 'image/jpeg', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'clinical-photos';
