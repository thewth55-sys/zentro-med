-- ============================================================
-- 094_handle_new_user_no_oauth_provision.sql
--
-- "Login con Google" (web) restringido a usuarios que YA tienen cuenta.
-- El registro de cuentas nuevas sigue siendo por el formulario de signup
-- (email), que recolecta los campos obligatorios (especialidad, teléfono,
-- cédula, T&C). Google no recolecta nada de eso, así que NO debe crear
-- cuentas: es solo un método de acceso para usuarios ya existentes.
--
-- Guard: si el usuario nuevo NO viene por 'email' (p.ej. Google), NO se
-- aprovisiona cuenta. Un usuario ya existente que entra con Google se
-- ENLAZA a su fila (Supabase no inserta una nueva → este trigger ni
-- dispara), así que conserva su cuenta. Un correo social sin cuenta queda
-- sin perfil y /auth/callback lo rechaza y limpia.
--
-- Es el mismo cuerpo de handle_new_user() de 086_signup_required_fields.sql
-- con el guard añadido al inicio — no cambia nada del provisioning de email.
--
-- Idempotente (CREATE OR REPLACE).
-- ============================================================

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
  -- Login social (Google, etc.) de un usuario NUEVO → sin cuenta.
  IF COALESCE(NEW.raw_app_meta_data->>'provider', 'email') <> 'email' THEN
    RETURN NEW;
  END IF;

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
