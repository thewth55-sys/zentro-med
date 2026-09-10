-- ============================================================
-- 122_storage_provider.sql — lets a stored object path be resolved
-- against the RIGHT backend now that new file uploads go to a
-- self-hosted MinIO instead of Supabase Storage, while everything
-- already uploaded stays in Supabase untouched (no data migration).
--
-- Only tables that store a BARE path (not a full URL) need this: a
-- path like "account-<id>/foo.png" has the same shape regardless of
-- backend, so it's genuinely ambiguous which one holds it. Columns
-- that already store a full URL (messages.media_url,
-- profiles.avatar_url, account.logoUrl) need nothing — an old
-- supabase.co URL and a new MinIO URL render identically with no
-- branching required.
--
-- Additive and fully backward-compatible: every existing row defaults
-- to 'supabase' (where it actually lives today), no backfill needed.
-- New rows going forward explicitly set 'minio' from application code.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE visit_photos
  ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'supabase'
    CHECK (storage_provider IN ('supabase', 'minio'));

ALTER TABLE consent_templates
  ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'supabase'
    CHECK (storage_provider IN ('supabase', 'minio'));

ALTER TABLE consent_documents
  ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'supabase'
    CHECK (storage_provider IN ('supabase', 'minio'));

ALTER TABLE consent_signatures
  ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'supabase'
    CHECK (storage_provider IN ('supabase', 'minio'));

ALTER TABLE clinical_note_signatures
  ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'supabase'
    CHECK (storage_provider IN ('supabase', 'minio'));

-- ============================================================
-- peek_signature_request — also surface storage_provider for the PDF
-- path (074's version only returned pdf_storage_path) so the API
-- route knows which backend to sign against. Same signature, safe
-- CREATE OR REPLACE.
-- ============================================================
CREATE OR REPLACE FUNCTION public.peek_signature_request(
  p_token_hash TEXT
) RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req signature_requests%ROWTYPE;
  v_title TEXT;
  v_content TEXT;
  v_source_type TEXT := 'text';
  v_pdf_storage_path TEXT;
  v_pdf_storage_provider TEXT;
BEGIN
  SELECT * INTO v_req FROM signature_requests WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_req.expires_at <= NOW() THEN
    RETURN json_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF v_req.consent_document_id IS NOT NULL THEN
    SELECT title, content, source_type, pdf_storage_path, storage_provider
      INTO v_title, v_content, v_source_type, v_pdf_storage_path, v_pdf_storage_provider
    FROM consent_documents WHERE id = v_req.consent_document_id;
  ELSE
    SELECT
      'Nota de evolución · ' || to_char(signed_at, 'DD Mon YYYY'),
      'Motivo de consulta:' || E'\n' || chief_complaint || E'\n\n' ||
        'Hallazgos y plan de tratamiento:' || E'\n' || findings_and_plan
    INTO v_title, v_content
    FROM clinical_notes WHERE id = v_req.clinical_note_id;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'title', v_title,
    'content', v_content,
    'source_type', v_source_type,
    'pdf_storage_path', v_pdf_storage_path,
    'pdf_storage_provider', v_pdf_storage_provider,
    'delivered_to_email', v_req.delivered_to_email,
    'already_signed', v_req.redeemed_at IS NOT NULL,
    'expires_at', v_req.expires_at
  );
END;
$$;

-- ============================================================
-- submit_signature — writes storage_provider = 'minio' on both
-- signature-row inserts, hardcoded rather than a new parameter: this
-- function is only ever called by the CURRENT app code path (which
-- now always uploads the signature PNG and stamped PDF to MinIO via
-- uploadSignatureImage/uploadObject before calling in here), so every
-- row this function creates from today onward is genuinely
-- MinIO-backed — same signature as 074's version, safe CREATE OR
-- REPLACE, no DROP FUNCTION needed.
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_signature(
  p_token_hash TEXT,
  p_signer_name TEXT,
  p_signature_storage_path TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_signed_pdf_storage_path TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req signature_requests%ROWTYPE;
  v_hash TEXT;
BEGIN
  SELECT * INTO v_req FROM signature_requests WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_req.expires_at <= NOW() THEN
    RETURN json_build_object('ok', false, 'reason', 'expired');
  END IF;
  IF v_req.redeemed_at IS NOT NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'already_signed');
  END IF;
  IF v_req.otp_verified_at IS NULL OR v_req.otp_verified_at <= NOW() - INTERVAL '15 minutes' THEN
    RETURN json_build_object('ok', false, 'reason', 'otp_not_verified');
  END IF;

  IF v_req.consent_document_id IS NOT NULL THEN
    SELECT COALESCE(pdf_hash, content_hash) INTO v_hash
    FROM consent_documents WHERE id = v_req.consent_document_id FOR UPDATE;
    IF v_hash IS NULL THEN
      RETURN json_build_object('ok', false, 'reason', 'document_not_found');
    END IF;

    INSERT INTO consent_signatures (
      account_id, consent_document_id, signer_name, signer_email,
      signature_storage_path, otp_verified_at, document_hash_at_signing,
      ip_address, user_agent, signed_pdf_storage_path, storage_provider
    ) VALUES (
      v_req.account_id, v_req.consent_document_id, p_signer_name, v_req.delivered_to_email,
      p_signature_storage_path, v_req.otp_verified_at, v_hash,
      p_ip_address, p_user_agent, p_signed_pdf_storage_path, 'minio'
    );

    UPDATE consent_documents SET status = 'signed' WHERE id = v_req.consent_document_id;
  ELSE
    SELECT content_hash INTO v_hash FROM clinical_notes WHERE id = v_req.clinical_note_id FOR UPDATE;
    IF v_hash IS NULL THEN
      RETURN json_build_object('ok', false, 'reason', 'document_not_found');
    END IF;

    INSERT INTO clinical_note_signatures (
      account_id, clinical_note_id, signer_name, signer_email,
      signature_storage_path, otp_verified_at, document_hash_at_signing,
      ip_address, user_agent, storage_provider
    ) VALUES (
      v_req.account_id, v_req.clinical_note_id, p_signer_name, v_req.delivered_to_email,
      p_signature_storage_path, v_req.otp_verified_at, v_hash,
      p_ip_address, p_user_agent, 'minio'
    );
  END IF;

  UPDATE signature_requests SET redeemed_at = NOW() WHERE id = v_req.id;

  RETURN json_build_object('ok', true);
END;
$$;
