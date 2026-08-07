-- ============================================================
-- 086_signup_required_fields.sql — signup form now collects (and
-- requires) more identity/contact info per Settings' "Cuenta 360"
-- admin review:
--   - accounts.specialty's allowed list widens from 7 to a much
--     broader medical/allied-health catalog, still capped by 'otro'
--     as a catch-all. Only 'odontologia' has behavioral effect
--     (Odontograma tab gate, src/lib/specialties.ts) — every other
--     value stays informational.
--   - accounts.website / social_links: optional, shown in the
--     platform-admin "Cuenta 360" panel.
--   - accounts.terms_accepted_at: stamped by handle_new_user() when
--     the signup form's (now-mandatory) terms checkbox was checked —
--     an audit timestamp, not just a boolean, since "when did they
--     accept" matters more than "did they" for a ToS record.
--   - profiles.license_number (already added by
--     050_room_address_and_profile_fields.sql for Settings → Tu
--     perfil) is now ALSO collected at signup — unlike brand_name/
--     specialty/phone/address (account-level, skipped for the
--     invite-flow signup), license_number is personal, so
--     handle_new_user() sets it for every new profile row regardless
--     of invite flow.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS social_links text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_specialty_check;
ALTER TABLE accounts
  ADD CONSTRAINT accounts_specialty_check CHECK (
    specialty IN (
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
  );

-- profiles.license_number already exists (050_room_address_and_profile_fields.sql) —
-- handle_new_user() below just starts populating it at signup time.

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
  v_phone TEXT;
  v_address TEXT;
  v_website TEXT;
  v_social_links TEXT;
  v_terms_accepted BOOLEAN;
  v_license_number TEXT;
  v_account_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_brand_name := COALESCE(NEW.raw_user_meta_data->>'brand_name', '');
  v_specialty := NULLIF(NEW.raw_user_meta_data->>'specialty', '');
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

  INSERT INTO public.accounts (
    name, owner_user_id, specialty, phone, address, website, social_links, terms_accepted_at
  )
  VALUES (
    COALESCE(NULLIF(v_brand_name, ''), NULLIF(v_full_name, ''), NEW.email, 'My account'),
    NEW.id,
    v_specialty,
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
