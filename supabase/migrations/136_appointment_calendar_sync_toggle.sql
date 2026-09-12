-- Per-appointment Google Calendar sync toggle.
--
-- Today syncAppointmentToGoogle() (src/lib/scheduling/google-calendar-
-- sync.ts) fans every appointment write out to EVERY connected
-- member's calendar unconditionally — there's no way to opt a single
-- appointment out. Requested by a prospective client on a sales call:
-- a doctor should be able to decide per-appointment whether it syncs,
-- instead of all-or-nothing.
--
-- Defaults to true so existing rows and the current fan-out behavior
-- are unaffected until someone explicitly unchecks it.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS sync_to_calendar boolean NOT NULL DEFAULT true;
