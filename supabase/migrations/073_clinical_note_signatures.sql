-- ============================================================
-- 073_clinical_note_signatures.sql — extends the informed-consent
-- e-signature infrastructure (072) so a patient can also sign an
-- evolution/clinical note, not just a standalone consent document.
--
-- Rather than force one polymorphic "signable document" table,
-- `signature_requests` (the shared link+OTP mechanism) is
-- generalized to point at EITHER a consent_documents row OR a
-- clinical_notes row — exactly one, enforced by a CHECK using
-- num_nonnulls(). Each target type keeps its own simple, strict
-- signatures table (consent_signatures already existed;
-- clinical_note_signatures is new here) rather than trying to share
-- one table with two nullable, alternately-set foreign keys.
--
-- The doctor's own signature on a clinical note already exists and
-- needs nothing new — every clinical_notes row is created already
-- "signed" (signed_at set at insert, content immutable per 038's
-- trigger, author = created_by). This migration only adds the
-- PATIENT's signature on top of that, via the same OTP-verified flow
-- as informed consent.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- clinical_notes needs the same tamper-evidence content_hash
-- consent_documents already has, so submit_signature() has something
-- to snapshot at signing time.
ALTER TABLE clinical_notes
  ADD COLUMN IF NOT EXISTS content_hash text
  GENERATED ALWAYS AS (
    encode(digest(chief_complaint || E'\n\n' || findings_and_plan, 'sha256'), 'hex')
  ) STORED;

-- ============================================================
-- signature_requests — generalize to point at either target
-- ============================================================
ALTER TABLE signature_requests
  ALTER COLUMN consent_document_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS clinical_note_id uuid REFERENCES clinical_notes(id) ON DELETE CASCADE;

ALTER TABLE signature_requests
  DROP CONSTRAINT IF EXISTS signature_requests_exactly_one_target;
ALTER TABLE signature_requests
  ADD CONSTRAINT signature_requests_exactly_one_target
  CHECK (num_nonnulls(consent_document_id, clinical_note_id) = 1);

CREATE INDEX IF NOT EXISTS idx_signature_requests_clinical_note ON signature_requests(clinical_note_id);

-- ============================================================
-- clinical_note_signatures — mirrors consent_signatures exactly,
-- just against clinical_notes instead of consent_documents. Same
-- "no client write policy at all" rule: every row comes from
-- submit_signature(), never a direct insert.
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_note_signatures (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  clinical_note_id          uuid NOT NULL UNIQUE REFERENCES clinical_notes(id) ON DELETE CASCADE,
  signer_name               text NOT NULL,
  signer_email              text NOT NULL,
  signature_storage_path    text NOT NULL,
  otp_verified_at           timestamptz NOT NULL,
  document_hash_at_signing  text NOT NULL,
  ip_address                text,
  user_agent                text,
  signed_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_note_signatures_account ON clinical_note_signatures(account_id);

ALTER TABLE clinical_note_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinical_note_signatures_select ON clinical_note_signatures;
CREATE POLICY clinical_note_signatures_select ON clinical_note_signatures FOR SELECT
  USING (is_account_member(account_id));

-- ============================================================
-- peek_signature_request — branch on which target is set
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
BEGIN
  SELECT * INTO v_req FROM signature_requests WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_req.expires_at <= NOW() THEN
    RETURN json_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF v_req.consent_document_id IS NOT NULL THEN
    SELECT title, content INTO v_title, v_content
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
    'delivered_to_email', v_req.delivered_to_email,
    'already_signed', v_req.redeemed_at IS NOT NULL,
    'expires_at', v_req.expires_at
  );
END;
$$;

-- ============================================================
-- submit_signature — branch on which target is set
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_signature(
  p_token_hash TEXT,
  p_signer_name TEXT,
  p_signature_storage_path TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT
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
    SELECT content_hash INTO v_hash FROM consent_documents WHERE id = v_req.consent_document_id FOR UPDATE;
    IF v_hash IS NULL THEN
      RETURN json_build_object('ok', false, 'reason', 'document_not_found');
    END IF;

    INSERT INTO consent_signatures (
      account_id, consent_document_id, signer_name, signer_email,
      signature_storage_path, otp_verified_at, document_hash_at_signing,
      ip_address, user_agent
    ) VALUES (
      v_req.account_id, v_req.consent_document_id, p_signer_name, v_req.delivered_to_email,
      p_signature_storage_path, v_req.otp_verified_at, v_hash,
      p_ip_address, p_user_agent
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
    -- No status column on clinical_notes — "signed by patient" is
    -- read back via the presence of a clinical_note_signatures row.
  END IF;

  UPDATE signature_requests SET redeemed_at = NOW() WHERE id = v_req.id;

  RETURN json_build_object('ok', true);
END;
$$;
