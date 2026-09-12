-- ============================================================
-- 137_account_collaborators.sql — external collaborators
--
-- Lets a user whose own account is A work inside a DIFFERENT
-- account B (e.g. a doctor who also sees patients at another
-- clinic), without ever becoming a real member of B and without
-- touching their own account. This is deliberately NOT "multi-
-- account membership" — `profiles` keeps its single `account_id`
-- (see 017_account_sharing.sql's "one account per user" design),
-- and `is_account_member()` is left completely untouched. Instead,
-- this adds a sibling function, `is_account_collaborator()`, OR'd
-- into the RLS policies of exactly the tables a collaborator needs
-- (patients, clinical records, prescriptions, agenda + the read-
-- only lookups their forms need) — never into billing/banking/
-- inventory, which stay reachable ONLY via `is_account_member()`
-- and are therefore inaccessible to a collaborator by simple
-- absence of a grant, no extra guard required.
--
-- A collaborator's role inside the host account is always fixed at
-- 'agent' — there is no admin/owner collaborator. Access is granted
-- via a short-lived invitation link (mirrors the account_invitations
-- / redeem_invitation() pattern in 017/019, but the acceptance RPC
-- here only INSERTs into account_collaborators — it never touches
-- profiles.account_id, unlike redeem_invitation()).
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- ------------------------------------------------------------
-- account_collaborators — an ACTIVE grant. Rows only exist here
-- once accepted; a pending invite lives in collaborator_invitations
-- below until then.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  collaborator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  invited_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (host_account_id, collaborator_user_id)
);

CREATE INDEX IF NOT EXISTS idx_account_collaborators_collaborator
  ON account_collaborators(collaborator_user_id)
  WHERE status = 'active';

ALTER TABLE account_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_collaborators_select ON account_collaborators;
CREATE POLICY account_collaborators_select ON account_collaborators FOR SELECT
  USING (
    is_account_member(host_account_id, 'admin')
    OR collaborator_user_id = auth.uid()
  );

-- Host admins can flip status (revoke); nothing else is writable
-- this way — creation only happens via accept_collaborator_invitation().
DROP POLICY IF EXISTS account_collaborators_update ON account_collaborators;
CREATE POLICY account_collaborators_update ON account_collaborators FOR UPDATE
  USING (is_account_member(host_account_id, 'admin'))
  WITH CHECK (is_account_member(host_account_id, 'admin'));

-- ------------------------------------------------------------
-- collaborator_invitations — pending, token-based invite links.
-- Same shape/security model as account_invitations (017): only the
-- SHA-256 hash is stored, the plaintext token is returned once at
-- creation and never persisted.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collaborator_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_host_pending
  ON collaborator_invitations(host_account_id, expires_at)
  WHERE accepted_at IS NULL;

ALTER TABLE collaborator_invitations ENABLE ROW LEVEL SECURITY;

-- Admin-only, own account — same shape as account_invitations's
-- (implicit) admin-only access via the invitations API route.
DROP POLICY IF EXISTS collaborator_invitations_select ON collaborator_invitations;
CREATE POLICY collaborator_invitations_select ON collaborator_invitations FOR SELECT
  USING (is_account_member(host_account_id, 'admin'));

DROP POLICY IF EXISTS collaborator_invitations_insert ON collaborator_invitations;
CREATE POLICY collaborator_invitations_insert ON collaborator_invitations FOR INSERT
  WITH CHECK (is_account_member(host_account_id, 'admin'));

DROP POLICY IF EXISTS collaborator_invitations_delete ON collaborator_invitations;
CREATE POLICY collaborator_invitations_delete ON collaborator_invitations FOR DELETE
  USING (is_account_member(host_account_id, 'admin'));

-- ------------------------------------------------------------
-- is_account_collaborator(target_account_id, min_role) — sibling of
-- is_account_member(), never called from within it and vice versa.
-- A collaborator's effective role is always 'agent', so this can
-- only ever satisfy min_role 'agent' or 'viewer' — never 'admin'/
-- 'owner'. Any route that requires admin+ (member management,
-- account settings, WhatsApp config, billing/banking/inventory
-- writes) is therefore already unreachable through this function
-- alone, with no extra check needed.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_account_collaborator(
  target_account_id UUID,
  min_role account_role_enum DEFAULT 'viewer'
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM account_collaborators ac
    WHERE ac.collaborator_user_id = auth.uid()
      AND ac.host_account_id = target_account_id
      AND ac.status = 'active'
      AND 2 -- fixed effective role: 'agent'
        >=
          CASE min_role
            WHEN 'owner'  THEN 4
            WHEN 'admin'  THEN 3
            WHEN 'agent'  THEN 2
            WHEN 'viewer' THEN 1
          END
  );
$$;

ALTER FUNCTION is_account_collaborator(UUID, account_role_enum) OWNER TO postgres;
REVOKE ALL ON FUNCTION is_account_collaborator(UUID, account_role_enum) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_account_collaborator(UUID, account_role_enum) TO authenticated;

-- ------------------------------------------------------------
-- Extend RLS on the tables a collaborator needs. Only these —
-- billing/banking/inventory tables are deliberately left untouched.
-- ------------------------------------------------------------

-- contacts (017_account_sharing.sql) — select/insert/update only;
-- delete stays member-only, not part of the requested scope.
DROP POLICY IF EXISTS contacts_select ON contacts;
CREATE POLICY contacts_select ON contacts FOR SELECT
  USING (is_account_member(account_id) OR is_account_collaborator(account_id));

DROP POLICY IF EXISTS contacts_insert ON contacts;
CREATE POLICY contacts_insert ON contacts FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

DROP POLICY IF EXISTS contacts_update ON contacts;
CREATE POLICY contacts_update ON contacts FOR UPDATE
  USING (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

-- patient_profiles (038_clinical_records.sql)
DROP POLICY IF EXISTS patient_profiles_select ON patient_profiles;
CREATE POLICY patient_profiles_select ON patient_profiles FOR SELECT
  USING (is_account_member(account_id) OR is_account_collaborator(account_id));

DROP POLICY IF EXISTS patient_profiles_insert ON patient_profiles;
CREATE POLICY patient_profiles_insert ON patient_profiles FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

DROP POLICY IF EXISTS patient_profiles_update ON patient_profiles;
CREATE POLICY patient_profiles_update ON patient_profiles FOR UPDATE
  USING (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

-- clinical_notes (038) — immutable, no UPDATE/DELETE policy exists.
DROP POLICY IF EXISTS clinical_notes_select ON clinical_notes;
CREATE POLICY clinical_notes_select ON clinical_notes FOR SELECT
  USING (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

DROP POLICY IF EXISTS clinical_notes_insert ON clinical_notes;
CREATE POLICY clinical_notes_insert ON clinical_notes FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

-- clinical_history_records (130 + the 135 WITH CHECK fix) — draft
-- edits and the sign transition both need the OR branch; keep the
-- USING/WITH CHECK split from 135 (see that migration's header for
-- why a single reused expression breaks the sign action).
DROP POLICY IF EXISTS clinical_history_records_select ON clinical_history_records;
CREATE POLICY clinical_history_records_select ON clinical_history_records FOR SELECT
  USING (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

DROP POLICY IF EXISTS clinical_history_records_insert ON clinical_history_records;
CREATE POLICY clinical_history_records_insert ON clinical_history_records FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

DROP POLICY IF EXISTS clinical_history_records_update ON clinical_history_records;
CREATE POLICY clinical_history_records_update ON clinical_history_records FOR UPDATE
  USING (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND signed_at IS NULL
  )
  WITH CHECK (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

-- prescriptions / prescription_items (132) — immutable, no UPDATE/DELETE.
DROP POLICY IF EXISTS prescriptions_select ON prescriptions;
CREATE POLICY prescriptions_select ON prescriptions FOR SELECT
  USING (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

DROP POLICY IF EXISTS prescriptions_insert ON prescriptions;
CREATE POLICY prescriptions_insert ON prescriptions FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

DROP POLICY IF EXISTS prescription_items_select ON prescription_items;
CREATE POLICY prescription_items_select ON prescription_items FOR SELECT
  USING (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

DROP POLICY IF EXISTS prescription_items_insert ON prescription_items;
CREATE POLICY prescription_items_insert ON prescription_items FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

-- appointments (037) — full CRUD, matches "compartir agenda".
DROP POLICY IF EXISTS appointments_select ON appointments;
CREATE POLICY appointments_select ON appointments FOR SELECT
  USING (is_account_member(account_id) OR is_account_collaborator(account_id));

DROP POLICY IF EXISTS appointments_insert ON appointments;
CREATE POLICY appointments_insert ON appointments FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

DROP POLICY IF EXISTS appointments_update ON appointments;
CREATE POLICY appointments_update ON appointments FOR UPDATE
  USING (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

DROP POLICY IF EXISTS appointments_delete ON appointments;
CREATE POLICY appointments_delete ON appointments FOR DELETE
  USING (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'));

-- accounts (017) — SELECT only. Needed so getCurrentAccount() (and
-- the client-side useAuth() mirror) can read the HOST account's own
-- row (name/logo/plan/etc.) when acting as a collaborator — without
-- this, resolving accountId to B still can't load B's account
-- summary, breaking the whole feature. Write access (accounts_update,
-- admin-only settings) is untouched — a collaborator is always 'agent'
-- there regardless, so it wouldn't pass anyway, but this keeps it
-- explicit that they never get it via this table.
DROP POLICY IF EXISTS accounts_select ON accounts;
CREATE POLICY accounts_select ON accounts FOR SELECT
  USING (is_account_member(id) OR is_account_collaborator(id));

-- Read-only lookups the agenda/prescription forms need (doctor,
-- room and service-type pickers) — write access to these stays
-- member/admin-only, unrelated to what a collaborator does.
DROP POLICY IF EXISTS doctors_select ON doctors;
CREATE POLICY doctors_select ON doctors FOR SELECT
  USING (is_account_member(account_id) OR is_account_collaborator(account_id));

DROP POLICY IF EXISTS rooms_select ON rooms;
CREATE POLICY rooms_select ON rooms FOR SELECT
  USING (is_account_member(account_id) OR is_account_collaborator(account_id));

DROP POLICY IF EXISTS service_types_select ON service_types;
CREATE POLICY service_types_select ON service_types FOR SELECT
  USING (is_account_member(account_id) OR is_account_collaborator(account_id));

-- ------------------------------------------------------------
-- peek_collaborator_invitation(p_token_hash) — anonymous read,
-- mirrors peek_invitation() (019_invitation_rpcs.sql).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.peek_collaborator_invitation(
  p_token_hash TEXT
) RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv collaborator_invitations%ROWTYPE;
  v_account_name TEXT;
BEGIN
  SELECT * INTO v_inv
  FROM collaborator_invitations
  WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF v_inv.accepted_at IS NOT NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'used');
  END IF;

  IF v_inv.expires_at <= NOW() THEN
    RETURN json_build_object('ok', false, 'reason', 'expired');
  END IF;

  SELECT name INTO v_account_name FROM accounts WHERE id = v_inv.host_account_id;

  RETURN json_build_object(
    'ok', true,
    'account_name', v_account_name,
    'expires_at', v_inv.expires_at
  );
END;
$$;

ALTER FUNCTION public.peek_collaborator_invitation(TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.peek_collaborator_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_collaborator_invitation(TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- accept_collaborator_invitation(p_token_hash) — authenticated.
-- Unlike redeem_invitation(), this NEVER touches profiles — it only
-- upserts a row into account_collaborators, so the caller's own
-- account is completely untouched.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_collaborator_invitation(
  p_token_hash TEXT
) RETURNS UUID  -- the host_account_id now collaborated on
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_inv collaborator_invitations%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inv
  FROM collaborator_invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '22023';
  END IF;
  IF v_inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation has already been redeemed' USING ERRCODE = '22023';
  END IF;
  IF v_inv.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Invitation has expired' USING ERRCODE = '22023';
  END IF;

  INSERT INTO account_collaborators (host_account_id, collaborator_user_id, invited_by_user_id, label, status)
  VALUES (v_inv.host_account_id, v_caller_id, v_inv.created_by_user_id, v_inv.label, 'active')
  ON CONFLICT (host_account_id, collaborator_user_id)
  DO UPDATE SET status = 'active', revoked_at = NULL;

  UPDATE collaborator_invitations
  SET accepted_at = NOW(),
      accepted_by_user_id = v_caller_id
  WHERE id = v_inv.id;

  RETURN v_inv.host_account_id;
END;
$$;

ALTER FUNCTION public.accept_collaborator_invitation(TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.accept_collaborator_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_collaborator_invitation(TEXT) TO authenticated;
