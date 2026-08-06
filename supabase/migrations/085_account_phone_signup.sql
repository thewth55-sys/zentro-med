-- ============================================================
-- 085_account_phone_signup.sql — contact phone number at signup,
-- alongside the address field 046_account_address_tax_id.sql already
-- added (both surface on the quote PDF header, same as brand_name).
--
-- `accounts.address` already existed; this migration only adds
-- `phone`. Both are now read out of the signup form's
-- raw_user_meta_data payload by handle_new_user(), same pattern
-- 042/076 already established for brand_name/specialty — optional,
-- blank when absent (older clients, invite-flow signup untouched).
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS phone text;

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
  v_account_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_brand_name := COALESCE(NEW.raw_user_meta_data->>'brand_name', '');
  v_specialty := NULLIF(NEW.raw_user_meta_data->>'specialty', '');
  v_phone := NULLIF(NEW.raw_user_meta_data->>'phone', '');
  v_address := NULLIF(NEW.raw_user_meta_data->>'address', '');
  IF v_specialty IS NULL OR v_specialty NOT IN
    ('odontologia', 'medicina_general', 'dermatologia', 'fisioterapia', 'nutricion', 'psicologia', 'otro')
  THEN
    v_specialty := 'odontologia';
  END IF;

  INSERT INTO public.accounts (name, owner_user_id, specialty, phone, address)
  VALUES (
    COALESCE(NULLIF(v_brand_name, ''), NULLIF(v_full_name, ''), NEW.email, 'My account'),
    NEW.id,
    v_specialty,
    v_phone,
    v_address
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
