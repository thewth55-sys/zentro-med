-- ============================================================
-- 077_link_documents_to_appointments.sql — lets staff associate a
-- consent document, quote, or invoice with the specific appointment
-- it belongs to, same as clinical_notes and visit_photos already do
-- (both got `appointment_id` on day one — see migrations 038/067).
--
-- Design notes
--   - Nullable FK, ON DELETE SET NULL: an appointment being deleted
--     shouldn't take a signed consent or a paid invoice down with it
--     — the document just becomes unlinked, exactly like clinical_notes
--     and visit_photos already behave.
--   - No new RLS policies needed: these tables' existing UPDATE
--     policies (all `is_account_member(account_id, 'agent')`) already
--     cover setting this single column — see each table's own
--     migration (039 for quotes/invoices, 072 for consent_documents).
--   - clinical_notes is the one clinical record that does NOT get a
--     retroactive-link path in the UI — its BEFORE UPDATE trigger
--     (038's block_clinical_notes_mutation) rejects any UPDATE
--     outright, so appointment_id can only be set at creation time
--     there. Nothing to change here for that table.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE consent_documents
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_consent_documents_appointment ON consent_documents(appointment_id)
  WHERE appointment_id IS NOT NULL;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_appointment ON quotes(appointment_id)
  WHERE appointment_id IS NOT NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_appointment ON invoices(appointment_id)
  WHERE appointment_id IS NOT NULL;
