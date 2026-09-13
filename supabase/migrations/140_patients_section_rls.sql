-- ============================================================
-- 140_patients_section_rls.sql — "Pacientes" as a restrictable
-- section in the custom-roles ("Perfiles") system.
--
-- The existing 4 sections (billing/banking/inventory/agenda,
-- src/lib/auth/sections.ts) are enforced by requireSectionAccess() at
-- specific Next.js API routes — but contacts/patient_profiles and the
-- clinical tables have NO API route in their write path at all (the
-- tab components call Supabase directly from the browser), so that
-- mechanism can't reach them. This adds a genuinely different,
-- RLS-level gate instead: a new function, is_section_hidden(), OR'd
-- with NOT into the existing policies.
--
-- is_section_hidden() looks up the CALLER's own profile in
-- target_account_id and checks account_roles.section_overrides for
-- the given section — same data (account_roles) the other 4 sections
-- already use, just read from Postgres instead of a route handler.
-- Admin+ are never affected (explicit bypass, same "defense in depth"
-- reasoning requireSectionAccess's own header comment gives), and an
-- external collaborator (137_account_collaborators.sql) is
-- unaffected by construction: their profile lives in their OWN
-- account, not target_account_id, so the lookup finds no row and
-- resolves to "not hidden" for them — Perfiles is purely an
-- internal-member concept, exactly like it already is for the other
-- 4 sections.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE OR REPLACE FUNCTION is_section_hidden(
  target_account_id UUID,
  section TEXT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN is_account_member(target_account_id, 'admin') THEN false
    ELSE COALESCE(
      (
        SELECT (ar.section_overrides ->> section) = 'hidden'
        FROM profiles p
        JOIN account_roles ar ON ar.id = p.custom_role_id
        WHERE p.user_id = auth.uid()
          AND p.account_id = target_account_id
      ),
      false
    )
  END;
$$;

ALTER FUNCTION is_section_hidden(UUID, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION is_section_hidden(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_section_hidden(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- contacts (017 base, 137 added the collaborator branch)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS contacts_select ON contacts;
CREATE POLICY contacts_select ON contacts FOR SELECT
  USING (
    (is_account_member(account_id) OR is_account_collaborator(account_id))
    AND NOT is_section_hidden(account_id, 'patients')
  );

DROP POLICY IF EXISTS contacts_insert ON contacts;
CREATE POLICY contacts_insert ON contacts FOR INSERT
  WITH CHECK (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

DROP POLICY IF EXISTS contacts_update ON contacts;
CREATE POLICY contacts_update ON contacts FOR UPDATE
  USING (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

DROP POLICY IF EXISTS contacts_delete ON contacts;
CREATE POLICY contacts_delete ON contacts FOR DELETE
  USING (is_account_member(account_id, 'agent') AND NOT is_section_hidden(account_id, 'patients'));

-- ------------------------------------------------------------
-- patient_profiles (038 base, 137 added the collaborator branch)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS patient_profiles_select ON patient_profiles;
CREATE POLICY patient_profiles_select ON patient_profiles FOR SELECT
  USING (
    (is_account_member(account_id) OR is_account_collaborator(account_id))
    AND NOT is_section_hidden(account_id, 'patients')
  );

DROP POLICY IF EXISTS patient_profiles_insert ON patient_profiles;
CREATE POLICY patient_profiles_insert ON patient_profiles FOR INSERT
  WITH CHECK (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

DROP POLICY IF EXISTS patient_profiles_update ON patient_profiles;
CREATE POLICY patient_profiles_update ON patient_profiles FOR UPDATE
  USING (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

DROP POLICY IF EXISTS patient_profiles_delete ON patient_profiles;
CREATE POLICY patient_profiles_delete ON patient_profiles FOR DELETE
  USING (is_account_member(account_id, 'admin') AND NOT is_section_hidden(account_id, 'patients'));

-- ------------------------------------------------------------
-- clinical_notes (038 base, 137 added the collaborator branch) —
-- immutable, no UPDATE/DELETE policy exists.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS clinical_notes_select ON clinical_notes;
CREATE POLICY clinical_notes_select ON clinical_notes FOR SELECT
  USING (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

DROP POLICY IF EXISTS clinical_notes_insert ON clinical_notes;
CREATE POLICY clinical_notes_insert ON clinical_notes FOR INSERT
  WITH CHECK (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

-- ------------------------------------------------------------
-- clinical_history_records (130 base, 135 fixed the WITH CHECK split,
-- 137 added the collaborator branch)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS clinical_history_records_select ON clinical_history_records;
CREATE POLICY clinical_history_records_select ON clinical_history_records FOR SELECT
  USING (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

DROP POLICY IF EXISTS clinical_history_records_insert ON clinical_history_records;
CREATE POLICY clinical_history_records_insert ON clinical_history_records FOR INSERT
  WITH CHECK (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

DROP POLICY IF EXISTS clinical_history_records_update ON clinical_history_records;
CREATE POLICY clinical_history_records_update ON clinical_history_records FOR UPDATE
  USING (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
    AND signed_at IS NULL
  )
  WITH CHECK (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

-- ------------------------------------------------------------
-- prescriptions / prescription_items (132 base, 137 added the
-- collaborator branch) — immutable, no UPDATE/DELETE.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS prescriptions_select ON prescriptions;
CREATE POLICY prescriptions_select ON prescriptions FOR SELECT
  USING (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

DROP POLICY IF EXISTS prescriptions_insert ON prescriptions;
CREATE POLICY prescriptions_insert ON prescriptions FOR INSERT
  WITH CHECK (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

DROP POLICY IF EXISTS prescription_items_select ON prescription_items;
CREATE POLICY prescription_items_select ON prescription_items FOR SELECT
  USING (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

DROP POLICY IF EXISTS prescription_items_insert ON prescription_items;
CREATE POLICY prescription_items_insert ON prescription_items FOR INSERT
  WITH CHECK (
    (is_account_member(account_id, 'agent') OR is_account_collaborator(account_id, 'agent'))
    AND NOT is_section_hidden(account_id, 'patients')
  );

-- ------------------------------------------------------------
-- odontogram_teeth (066) — never got a collaborator branch, plain
-- is_account_member() only.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS odontogram_teeth_select ON odontogram_teeth;
CREATE POLICY odontogram_teeth_select ON odontogram_teeth FOR SELECT
  USING (is_account_member(account_id) AND NOT is_section_hidden(account_id, 'patients'));

DROP POLICY IF EXISTS odontogram_teeth_insert ON odontogram_teeth;
CREATE POLICY odontogram_teeth_insert ON odontogram_teeth FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') AND NOT is_section_hidden(account_id, 'patients'));

DROP POLICY IF EXISTS odontogram_teeth_update ON odontogram_teeth;
CREATE POLICY odontogram_teeth_update ON odontogram_teeth FOR UPDATE
  USING (is_account_member(account_id, 'agent') AND NOT is_section_hidden(account_id, 'patients'));

DROP POLICY IF EXISTS odontogram_teeth_delete ON odontogram_teeth;
CREATE POLICY odontogram_teeth_delete ON odontogram_teeth FOR DELETE
  USING (is_account_member(account_id, 'agent') AND NOT is_section_hidden(account_id, 'patients'));
