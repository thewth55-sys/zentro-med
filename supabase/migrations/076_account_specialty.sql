-- ============================================================
-- 076_account_specialty.sql — clinic specialty per account, so
-- non-dental practices can hide the Odontograma tab (see
-- src/lib/specialties.ts for the fixed value list and the
-- showsOdontogram() helper contact-detail-view.tsx uses).
--
-- Design notes
--   - DEFAULT 'odontologia', not NULL: this product's odontogram
--     predates this column — every existing account has been using it
--     unconditionally. Defaulting new AND existing rows to
--     'odontologia' preserves that behavior for everyone who hasn't
--     explicitly said otherwise, instead of silently hiding a feature
--     accounts already rely on.
--   - handle_new_user() (042) now reads an optional `specialty` out of
--     the same raw_user_meta_data payload signup already sends
--     full_name/brand_name through — falls back to the column's own
--     default when absent (older clients, invite-flow signup) via
--     NULLIF + COALESCE against the fixed value list.
--   - Trigger functions take no parameters (they read NEW/OLD), so
--     CREATE OR REPLACE is a true replace here — no DROP FUNCTION
--     dance needed (contrast migration 074's submit_signature, which
--     genuinely changed its argument list).
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS specialty text NOT NULL DEFAULT 'odontologia';

ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_specialty_check;
ALTER TABLE accounts
  ADD CONSTRAINT accounts_specialty_check CHECK (
    specialty IN ('odontologia', 'medicina_general', 'dermatologia', 'fisioterapia', 'nutricion', 'psicologia', 'otro')
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_brand_name TEXT;
  v_specialty TEXT;
  v_account_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_brand_name := COALESCE(NEW.raw_user_meta_data->>'brand_name', '');
  v_specialty := NULLIF(NEW.raw_user_meta_data->>'specialty', '');
  IF v_specialty IS NULL OR v_specialty NOT IN
    ('odontologia', 'medicina_general', 'dermatologia', 'fisioterapia', 'nutricion', 'psicologia', 'otro')
  THEN
    v_specialty := 'odontologia';
  END IF;

  INSERT INTO public.accounts (name, owner_user_id, specialty)
  VALUES (
    COALESCE(NULLIF(v_brand_name, ''), NULLIF(v_full_name, ''), NEW.email, 'My account'),
    NEW.id,
    v_specialty
  )
  RETURNING id INTO v_account_id;

  INSERT INTO public.profiles (user_id, full_name, email, account_id, account_role)
  VALUES (NEW.id, v_full_name, NEW.email, v_account_id, 'owner');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to bootstrap account/profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
