-- ============================================================
-- 131_soap_notes.sql — SOAP-shaped columns on clinical_notes.
--
-- Consolidates the two clinical-note UIs that existed before this
-- (a quick-add widget and the full Médico-tab form, both writing
-- chief_complaint/findings_and_plan) into one "Notas de evolución"
-- tab using the SOAP method (Subjetivo/Objetivo/Análisis/Plan) from
-- the approved Expediente Clínico mockup.
--
-- Nullable, additive columns — NOT a rename/replace of the existing
-- chief_complaint/findings_and_plan columns:
--   - `findings_and_plan` already IS "the plan" in every note ever
--     written; the new UI just labels that same field "Plan" instead
--     of adding a redundant column.
--   - `chief_complaint` stays NOT NULL. The new SOAP form doesn't ask
--     for a separate chief complaint field (the mockup doesn't have
--     one) — the app populates it from the Subjective text at insert
--     time, so old reporting/queries that read chief_complaint keep
--     working unchanged, with no destructive schema change (no
--     dropped NOT NULL, no data migration) for a legal-record table.
--   - `subjective`/`objective`/`assessment` are nullable so every
--     note written before this migration (which has none of them)
--     stays valid as-is — the UI renders those as empty/omitted for
--     old notes rather than backfilling fabricated content.
--
-- No change to the immutability trigger from 038 — a clinical note is
-- still a legal record from the moment it's saved, same as before.
--
-- Deliberately NOT touched: `clinical_notes.content_hash`
-- (073_clinical_note_signatures.sql) keeps hashing only
-- chief_complaint + findings_and_plan. A GENERATED STORED column's
-- expression can only be changed by dropping and re-adding the
-- column, which would recompute it for every existing row under a
-- NEW formula — silently invalidating the tamper-evidence hash of
-- any note a patient already signed in production under the OLD
-- formula. That risk isn't worth taking for a legal-record integrity
-- mechanism. In practice this is a narrow gap, not a real hole: the
-- hard immutability trigger already blocks changing subjective/
-- objective/assessment (or anything else) after a note is created,
-- regardless of what content_hash covers.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE clinical_notes
  ADD COLUMN IF NOT EXISTS subjective text,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS assessment text;
