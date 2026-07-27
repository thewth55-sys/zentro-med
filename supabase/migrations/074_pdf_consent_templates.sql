-- ============================================================
-- 074_pdf_consent_templates.sql — reusable PDF templates for
-- informed consent, stamped with the patient's signature + name +
-- date at signing time (like Zentro Med's own PDF quotes/invoices),
-- instead of only supporting typed plain text.
--
-- Scope, deliberately: this does NOT rewrite text inside the PDF
-- (Word-style {{token}} substitution) — PDFs aren't easily editable
-- that way. A template's legal text is fixed; the only per-patient
-- customization is WHERE the signature/name/date get stamped, which
-- is configured ONCE per template (stamp_page_number/x/y_fraction)
-- and reused for every patient sent that template. DOCX isn't
-- supported for this flow — only PDF, since browsers render it
-- natively (no conversion step needed to preview it).
--
-- consent_documents gains a `source_type` discriminator:
--   'text' — existing behavior, `content`/`content_hash` (already a
--            GENERATED column) unchanged.
--   'pdf'  — `content`/`content_hash` are NULL; `pdf_storage_path` +
--            `pdf_hash` take their place. `pdf_hash` can't be a
--            GENERATED column (the file lives in Storage, not a
--            Postgres column) — the API route computes and stores it
--            explicitly when the template is copied for this patient.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS consent_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  storage_path          text NOT NULL,
  -- Where the signature block (image + "Nombre — Fecha" text) gets
  -- stamped. Fractions are page-relative, bottom-left origin (matches
  -- pdf-lib's coordinate system directly, no conversion needed):
  -- 0,0 = bottom-left corner, 1,1 = top-right corner.
  stamp_page_number     integer NOT NULL DEFAULT 1 CHECK (stamp_page_number >= 1),
  stamp_x_fraction      numeric NOT NULL DEFAULT 0.55 CHECK (stamp_x_fraction BETWEEN 0 AND 1),
  stamp_y_fraction      numeric NOT NULL DEFAULT 0.12 CHECK (stamp_y_fraction BETWEEN 0 AND 1),
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_templates_account ON consent_templates(account_id);

ALTER TABLE consent_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consent_templates_select ON consent_templates;
CREATE POLICY consent_templates_select ON consent_templates FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS consent_templates_insert ON consent_templates;
CREATE POLICY consent_templates_insert ON consent_templates FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS consent_templates_update ON consent_templates;
CREATE POLICY consent_templates_update ON consent_templates FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS consent_templates_delete ON consent_templates;
CREATE POLICY consent_templates_delete ON consent_templates FOR DELETE
  USING (is_account_member(account_id, 'agent'));

-- ============================================================
-- consent_documents — add the PDF-sourced shape alongside the
-- existing typed-text one.
-- ============================================================
ALTER TABLE consent_documents
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE consent_documents
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'text' CHECK (source_type IN ('text', 'pdf')),
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES consent_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS pdf_hash text,
  ADD COLUMN IF NOT EXISTS stamp_page_number integer,
  ADD COLUMN IF NOT EXISTS stamp_x_fraction numeric,
  ADD COLUMN IF NOT EXISTS stamp_y_fraction numeric;

ALTER TABLE consent_documents
  DROP CONSTRAINT IF EXISTS consent_documents_source_shape;
ALTER TABLE consent_documents
  ADD CONSTRAINT consent_documents_source_shape CHECK (
    (source_type = 'text' AND content IS NOT NULL) OR
    (source_type = 'pdf' AND pdf_storage_path IS NOT NULL AND pdf_hash IS NOT NULL)
  );

-- ============================================================
-- consent_signatures — the final stamped PDF, for PDF-sourced
-- documents only (NULL for typed-text ones).
-- ============================================================
ALTER TABLE consent_signatures
  ADD COLUMN IF NOT EXISTS signed_pdf_storage_path text;

-- ============================================================
-- peek_signature_request — also surface source_type/pdf_storage_path
-- so the /firmar page can show an <iframe> of the actual PDF instead
-- of a text block. Signing-page-side, that's all it needs — the
-- stamp coordinates only matter to submit_signature (server-side).
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
BEGIN
  SELECT * INTO v_req FROM signature_requests WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_req.expires_at <= NOW() THEN
    RETURN json_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF v_req.consent_document_id IS NOT NULL THEN
    SELECT title, content, source_type, pdf_storage_path
      INTO v_title, v_content, v_source_type, v_pdf_storage_path
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
    'delivered_to_email', v_req.delivered_to_email,
    'already_signed', v_req.redeemed_at IS NOT NULL,
    'expires_at', v_req.expires_at
  );
END;
$$;

-- ============================================================
-- submit_signature — accepts an optional signed-PDF storage path
-- (the API route builds this file via pdf-lib before calling in,
-- only for PDF-sourced consent documents) and uses pdf_hash instead
-- of content_hash as the tamper-evidence snapshot when applicable.
--
-- Adding a 6th parameter changes the function's signature — Postgres
-- treats CREATE OR REPLACE with a different arg list as a NEW
-- overload, not a true replace, which would leave the old 5-arg
-- version callable too and confuse PostgREST's overload resolution.
-- Drop the old signature explicitly first, then re-grant (a fresh
-- CREATE, unlike a same-signature REPLACE, does NOT carry over the
-- previous GRANTs).
-- ============================================================
DROP FUNCTION IF EXISTS public.submit_signature(TEXT, TEXT, TEXT, TEXT, TEXT);

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
      ip_address, user_agent, signed_pdf_storage_path
    ) VALUES (
      v_req.account_id, v_req.consent_document_id, p_signer_name, v_req.delivered_to_email,
      p_signature_storage_path, v_req.otp_verified_at, v_hash,
      p_ip_address, p_user_agent, p_signed_pdf_storage_path
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
      ip_address, user_agent
    ) VALUES (
      v_req.account_id, v_req.clinical_note_id, p_signer_name, v_req.delivered_to_email,
      p_signature_storage_path, v_req.otp_verified_at, v_hash,
      p_ip_address, p_user_agent
    );
  END IF;

  UPDATE signature_requests SET redeemed_at = NOW() WHERE id = v_req.id;

  RETURN json_build_object('ok', true);
END;
$$;

ALTER FUNCTION public.submit_signature(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.submit_signature(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_signature(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
