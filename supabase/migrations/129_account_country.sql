-- ============================================================
-- 129_account_country.sql — operating country per account, so the
-- clinical-record/prescription features can show the right fields,
-- required documents, and legal citations for Mexico vs Colombia
-- (see src/lib/country.ts for the fixed value list and any
-- country-aware helper).
--
-- Clones the exact pattern of 076_account_specialty.sql:
--   - `country TEXT NOT NULL DEFAULT` + CHECK, not an enum — mirrors
--     how `specialty` is done, keeps both "small fixed catalog on
--     accounts" columns consistent.
--   - DEFAULT 'mx': every existing account predates this column and
--     this product's primary market is Mexico — defaulting existing
--     AND new rows to 'mx' avoids silently reclassifying any existing
--     account as Colombian.
--   - `handle_new_user()` reads an optional `country` out of the same
--     `raw_user_meta_data` payload signup already sends
--     specialty/phone/license_number through — falls back to the
--     column's own default when absent or invalid.
--   - This is the LATEST body of handle_new_user(), from
--     094_handle_new_user_no_oauth_provision.sql — extending that
--     one (not 076's) so the OAuth guard and all fields added since
--     076 (phone/address/website/social_links/terms_accepted/
--     license_number) are preserved.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'mx';

ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_country_check;
ALTER TABLE accounts
  ADD CONSTRAINT accounts_country_check CHECK (country IN ('mx', 'co'));

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
  v_country TEXT;
  v_phone TEXT;
  v_address TEXT;
  v_website TEXT;
  v_social_links TEXT;
  v_terms_accepted BOOLEAN;
  v_license_number TEXT;
  v_account_id UUID;
BEGIN
  -- Login social (Google, etc.) de un usuario NUEVO → sin cuenta.
  IF COALESCE(NEW.raw_app_meta_data->>'provider', 'email') <> 'email' THEN
    RETURN NEW;
  END IF;

  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_brand_name := COALESCE(NEW.raw_user_meta_data->>'brand_name', '');
  v_specialty := NULLIF(NEW.raw_user_meta_data->>'specialty', '');
  v_country := NULLIF(NEW.raw_user_meta_data->>'country', '');
  v_phone := NULLIF(NEW.raw_user_meta_data->>'phone', '');
  v_address := NULLIF(NEW.raw_user_meta_data->>'address', '');
  v_website := NULLIF(NEW.raw_user_meta_data->>'website', '');
  v_social_links := NULLIF(NEW.raw_user_meta_data->>'social_links', '');
  v_terms_accepted := COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, false);
  v_license_number := NULLIF(NEW.raw_user_meta_data->>'license_number', '');

  IF v_specialty IS NULL OR v_specialty NOT IN (
      'odontologia', 'medicina_general', 'medicina_familiar', 'medicina_interna',
      'medicina_urgencias', 'pediatria', 'ginecologia_obstetricia', 'cardiologia',
      'dermatologia', 'oftalmologia', 'otorrinolaringologia', 'traumatologia_ortopedia',
      'neurologia', 'neurocirugia', 'psiquiatria', 'endocrinologia', 'gastroenterologia',
      'urologia', 'oncologia', 'hematologia', 'anestesiologia', 'radiologia_imagenologia',
      'cirugia_general', 'cirugia_plastica', 'reumatologia', 'neumologia', 'alergologia',
      'geriatria', 'medicina_deportiva', 'medicina_estetica', 'nefrologia', 'infectologia',
      'genetica_medica', 'patologia', 'medicina_del_trabajo',
      'fisioterapia', 'nutricion', 'psicologia', 'quiropractica', 'terapia_ocupacional',
      'optometria', 'podologia', 'fonoaudiologia', 'acupuntura', 'enfermeria',
      'veterinaria', 'otro'
    )
  THEN
    v_specialty := 'odontologia';
  END IF;

  IF v_country IS NULL OR v_country NOT IN ('mx', 'co') THEN
    v_country := 'mx';
  END IF;

  INSERT INTO public.accounts (
    name, owner_user_id, specialty, country, phone, address, website, social_links, terms_accepted_at
  )
  VALUES (
    COALESCE(NULLIF(v_brand_name, ''), NULLIF(v_full_name, ''), NEW.email, 'My account'),
    NEW.id,
    v_specialty,
    v_country,
    v_phone,
    v_address,
    v_website,
    v_social_links,
    CASE WHEN v_terms_accepted THEN now() ELSE NULL END
  )
  RETURNING id INTO v_account_id;

  INSERT INTO public.profiles (user_id, full_name, email, account_id, account_role, license_number)
  VALUES (NEW.id, v_full_name, NEW.email, v_account_id, 'owner', v_license_number);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to bootstrap account/profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
