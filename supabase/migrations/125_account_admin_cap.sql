-- ============================================================
-- 125_account_admin_cap.sql — an account can have at most 2 admins
-- (owner doesn't count — it's already structurally unique via
-- idx_accounts_one_per_owner). A single BEFORE trigger on `profiles`
-- is the one enforcement point that covers every existing write path
-- that can grant 'admin' — set_member_role, redeem_invitation, and
-- transfer_account_ownership (which demotes the outgoing owner to
-- 'admin') — without touching any of those three functions' bodies.
-- Same trust model this schema already uses for "owner is singular":
-- a structural constraint, not application logic that could be
-- forgotten by some future write path.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_max_two_admins()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_count INT;
BEGIN
  IF NEW.account_role = 'admin'
     AND (TG_OP = 'INSERT' OR OLD.account_role IS DISTINCT FROM 'admin') THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM profiles
    WHERE account_id = NEW.account_id
      AND account_role = 'admin'
      AND user_id <> NEW.user_id;

    IF v_admin_count >= 2 THEN
      RAISE EXCEPTION 'ZENTRO_ADMIN_CAP: an account can have at most 2 admins'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_max_two_admins ON profiles;
CREATE TRIGGER trg_enforce_max_two_admins
  BEFORE INSERT OR UPDATE OF account_role ON profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_max_two_admins();
