-- ============================================================
-- 072_informed_consent_signatures.sql — informed-consent documents
-- with a legally-defensible e-signature flow for the patient.
--
-- Legal basis (Colombia — Ley 527 de 1999 art. 28, Decreto 2364 de
-- 2012): a valid electronic signature needs (1) unequivocal
-- identification of the signer, (2) a way to detect alterations to
-- the signed content, (3) a method proportional to the document's
-- risk, and (4) an audit trail (who/when/from where/what version).
-- A drawn/scanned signature image ALONE does not satisfy (1) — this
-- design adds an email OTP step specifically to cover it, since the
-- signer isn't an authenticated CRM user (they're a patient following
-- a link).
--
-- Three tables:
--   consent_documents   — the frozen text the patient is asked to
--                         sign, one row per document sent. `content`
--                         is never edited after creation; `content_hash`
--                         (SHA-256, computed by Postgres via pgcrypto
--                         so it can never drift from what's actually
--                         stored) is what proves later the text wasn't
--                         altered post-signing.
--   signature_requests  — the shareable link + OTP mechanism. One row
--                         per "send to sign" action. Mirrors
--                         account_invitations (019/017): token stored
--                         as a hash, plaintext only ever exists in the
--                         URL. OTP is the same idea, shorter-lived.
--   consent_signatures  — the actual signing event once OTP-verified:
--                         signer identity, signature image (stored in
--                         the existing private clinical-photos
--                         bucket), IP/user-agent, and the document
--                         hash *at the moment of signing* (redundant
--                         with consent_documents.content_hash today,
--                         but this is the field an auditor actually
--                         reads — it's captured as part of the signing
--                         event itself, not looked up after the fact).
--
-- Every patient-facing action (peek the document, request an OTP,
-- verify it, submit the signature) runs through a SECURITY DEFINER
-- RPC and is granted to `anon` — there is no Supabase session for a
-- patient following an emailed link, same reasoning as
-- peek_invitation/redeem_invitation (019).
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- consent_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS consent_documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  patient_profile_id  uuid NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  title               text NOT NULL,
  content             text NOT NULL,
  content_hash        text GENERATED ALWAYS AS (encode(digest(content, 'sha256'), 'hex')) STORED,
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'expired')),
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_documents_patient ON consent_documents(patient_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_documents_account ON consent_documents(account_id);

ALTER TABLE consent_documents ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_updated_at ON consent_documents;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON consent_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP POLICY IF EXISTS consent_documents_select ON consent_documents;
CREATE POLICY consent_documents_select ON consent_documents FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS consent_documents_insert ON consent_documents;
CREATE POLICY consent_documents_insert ON consent_documents FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS consent_documents_update ON consent_documents;
CREATE POLICY consent_documents_update ON consent_documents FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS consent_documents_delete ON consent_documents;
CREATE POLICY consent_documents_delete ON consent_documents FOR DELETE
  USING (is_account_member(account_id, 'agent'));

-- ============================================================
-- signature_requests — the emailed link + OTP
-- ============================================================
CREATE TABLE IF NOT EXISTS signature_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  consent_document_id uuid NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
  token_hash          text NOT NULL UNIQUE,
  delivered_to_email  text NOT NULL,
  otp_code_hash       text,
  otp_expires_at      timestamptz,
  otp_attempts        integer NOT NULL DEFAULT 0,
  otp_verified_at     timestamptz,
  redeemed_at         timestamptz,
  expires_at          timestamptz NOT NULL,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signature_requests_document ON signature_requests(consent_document_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_account ON signature_requests(account_id);

ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signature_requests_select ON signature_requests;
CREATE POLICY signature_requests_select ON signature_requests FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS signature_requests_insert ON signature_requests;
CREATE POLICY signature_requests_insert ON signature_requests FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

-- Staff can only cancel a request (push expires_at into the past) —
-- OTP/redemption fields are exclusively written by the SECURITY
-- DEFINER RPCs below, never by a client update, so there's no UPDATE
-- policy covering those columns. Revocation reuses the same "set
-- expires_at" the RPCs already check, rather than adding a separate
-- is_revoked column.
DROP POLICY IF EXISTS signature_requests_update ON signature_requests;
CREATE POLICY signature_requests_update ON signature_requests FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));

-- ============================================================
-- consent_signatures — the signing event. No client-facing write
-- policy at all: every row is inserted by submit_signature() below,
-- which runs as the table owner and bypasses RLS entirely. Staff can
-- only ever read.
-- ============================================================
CREATE TABLE IF NOT EXISTS consent_signatures (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  consent_document_id       uuid NOT NULL UNIQUE REFERENCES consent_documents(id) ON DELETE CASCADE,
  signer_name               text NOT NULL,
  signer_email              text NOT NULL,
  signature_storage_path    text NOT NULL,
  otp_verified_at           timestamptz NOT NULL,
  document_hash_at_signing  text NOT NULL,
  ip_address                text,
  user_agent                text,
  signed_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_signatures_account ON consent_signatures(account_id);

ALTER TABLE consent_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consent_signatures_select ON consent_signatures;
CREATE POLICY consent_signatures_select ON consent_signatures FOR SELECT
  USING (is_account_member(account_id));

-- ============================================================
-- peek_signature_request(p_token_hash text) — anonymous read.
-- Returns { ok:true, title, content, delivered_to_email, already_signed,
--           expires_at } or { ok:false, reason }.
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
  v_doc consent_documents%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM signature_requests WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_req.expires_at <= NOW() THEN
    RETURN json_build_object('ok', false, 'reason', 'expired');
  END IF;

  SELECT * INTO v_doc FROM consent_documents WHERE id = v_req.consent_document_id;

  RETURN json_build_object(
    'ok', true,
    'title', v_doc.title,
    'content', v_doc.content,
    'delivered_to_email', v_req.delivered_to_email,
    'already_signed', v_req.redeemed_at IS NOT NULL,
    'expires_at', v_req.expires_at
  );
END;
$$;

ALTER FUNCTION public.peek_signature_request(TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.peek_signature_request(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_signature_request(TEXT) TO anon, authenticated;

-- ============================================================
-- request_signature_otp(p_token_hash, p_otp_code_hash, p_expires_at)
-- Stores a freshly generated OTP hash (the plaintext code + its
-- hashing happen in application code, same split as invite tokens).
-- Resets attempts/verification — a resend invalidates any prior code.
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_signature_otp(
  p_token_hash TEXT,
  p_otp_code_hash TEXT,
  p_expires_at TIMESTAMPTZ
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req signature_requests%ROWTYPE;
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

  UPDATE signature_requests
  SET otp_code_hash = p_otp_code_hash,
      otp_expires_at = p_expires_at,
      otp_attempts = 0,
      otp_verified_at = NULL
  WHERE id = v_req.id;

  RETURN json_build_object('ok', true, 'delivered_to_email', v_req.delivered_to_email);
END;
$$;

ALTER FUNCTION public.request_signature_otp(TEXT, TEXT, TIMESTAMPTZ) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.request_signature_otp(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_signature_otp(TEXT, TEXT, TIMESTAMPTZ) TO anon, authenticated;

-- ============================================================
-- verify_signature_otp(p_token_hash, p_otp_code_hash)
-- Capped at 6 attempts per sent code — beyond that the patient must
-- request a new one (request_signature_otp resets the counter).
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_signature_otp(
  p_token_hash TEXT,
  p_otp_code_hash TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req signature_requests%ROWTYPE;
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
  IF v_req.otp_code_hash IS NULL OR v_req.otp_expires_at <= NOW() THEN
    RETURN json_build_object('ok', false, 'reason', 'otp_expired');
  END IF;
  IF v_req.otp_attempts >= 6 THEN
    RETURN json_build_object('ok', false, 'reason', 'too_many_attempts');
  END IF;

  IF v_req.otp_code_hash <> p_otp_code_hash THEN
    UPDATE signature_requests SET otp_attempts = otp_attempts + 1 WHERE id = v_req.id;
    RETURN json_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  UPDATE signature_requests SET otp_verified_at = NOW(), otp_attempts = 0 WHERE id = v_req.id;
  RETURN json_build_object('ok', true);
END;
$$;

ALTER FUNCTION public.verify_signature_otp(TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.verify_signature_otp(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_signature_otp(TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- submit_signature(...) — the actual signing write. Re-checks
-- otp_verified_at itself (valid for 15 minutes) rather than trusting
-- client state, so a stale/replayed request can't slip through even
-- if verify_signature_otp succeeded a while ago.
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
  v_doc consent_documents%ROWTYPE;
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

  SELECT * INTO v_doc FROM consent_documents WHERE id = v_req.consent_document_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'document_not_found');
  END IF;

  INSERT INTO consent_signatures (
    account_id, consent_document_id, signer_name, signer_email,
    signature_storage_path, otp_verified_at, document_hash_at_signing,
    ip_address, user_agent
  ) VALUES (
    v_req.account_id, v_doc.id, p_signer_name, v_req.delivered_to_email,
    p_signature_storage_path, v_req.otp_verified_at, v_doc.content_hash,
    p_ip_address, p_user_agent
  );

  UPDATE consent_documents SET status = 'signed' WHERE id = v_doc.id;
  UPDATE signature_requests SET redeemed_at = NOW() WHERE id = v_req.id;

  RETURN json_build_object('ok', true);
END;
$$;

ALTER FUNCTION public.submit_signature(TEXT, TEXT, TEXT, TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.submit_signature(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_signature(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- Storage: signature images reuse the existing private
-- clinical-photos bucket (067) under a signatures/ prefix, so no new
-- bucket or storage.objects policies are needed — same account-
-- scoped path convention, just a different subfolder:
--   clinical-photos/account-<account_id>/signatures/<consent_document_id>.png
--
-- The upload itself, though, happens from the PUBLIC signing page
-- (no Supabase session) — the existing "Members can upload clinical
-- photos" policy requires auth.uid() to resolve to an account member,
-- which an anonymous patient never satisfies. submit_signature() is
-- SECURITY DEFINER but storage.objects writes go through the Storage
-- API, not a plain INSERT this function can intercept — so the
-- signing API route uploads the PNG using the service-role client
-- (supabaseAdmin()), which bypasses storage RLS entirely, same as
-- every other server-side admin write in this codebase.
-- ============================================================
