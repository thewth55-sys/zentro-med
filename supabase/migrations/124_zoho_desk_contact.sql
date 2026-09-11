-- ============================================================
-- 124_zoho_desk_contact.sql — remembers each staff user's Zoho Desk
-- contact id the first time they submit a support ticket from the
-- in-app "Centro de ayuda" screen.
--
-- Zoho Desk's POST /contacts does NOT dedupe by email — calling it
-- twice for the same person creates two separate contacts. Since
-- there's no reliable "find by email" we're allowed to call without
-- an extra OAuth scope round-trip, the app creates the Zoho contact
-- ONCE per user and remembers the id here, instead of re-searching
-- Zoho (or worse, silently creating duplicates) on every ticket.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS zoho_desk_contact_id text;
