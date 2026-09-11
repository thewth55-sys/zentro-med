"use client";

// ============================================================
// SoapNotesTab — "Notas de evolución" (Expediente Clínico tab 2 of
// 3). Consolidates what used to be split across two places:
//   - The always-visible ClinicalHistoryPanel widget (quick add,
//     no addenda/signature) — now trimmed to a read-only summary.
//   - MedicalTab's clinical-notes section (full create + addenda +
//     patient e-signature) — that logic moves here.
//
// Notes are SOAP-shaped (migration 131: subjective/objective/
// assessment columns added to clinical_notes) but immutable from the
// moment they're saved, same as before (migration 038's trigger is
// untouched) — there is no draft state here, unlike the Historia
// Clínica tab.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getClinicalPhotoUrl } from "@/lib/storage/clinical-photos";
import type { Appointment, ClinicalNote, ClinicalNoteAddendum, ClinicalNoteSignature, Doctor } from "@/types";

interface SoapNotesTabProps {
  contactId: string;
  patientProfileId: string | null;
}

const SOAP_LETTERS = [
  { key: "subjective" as const, letter: "S", labelKey: "subjective" },
  { key: "objective" as const, letter: "O", labelKey: "objective" },
  { key: "assessment" as const, letter: "A", labelKey: "assessment" },
  { key: "findings_and_plan" as const, letter: "P", labelKey: "plan" },
];

export function SoapNotesTab({ contactId, patientProfileId }: SoapNotesTabProps) {
  const t = useTranslations("Contacts.detailView.soapNotesTab");
  const supabase = createClient();
  const { accountId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [addendaByNote, setAddendaByNote] = useState<Record<string, ClinicalNoteAddendum[]>>({});
  const [signaturesByNote, setSignaturesByNote] = useState<Record<string, ClinicalNoteSignature>>({});
  const [signatureUrlsByNote, setSignatureUrlsByNote] = useState<Record<string, string | null>>({});
  const [sendingSignatureFor, setSendingSignatureFor] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [noteDoctorId, setNoteDoctorId] = useState("");
  const [noteAppointmentId, setNoteAppointmentId] = useState("");
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [addendumOpenFor, setAddendumOpenFor] = useState<string | null>(null);
  const [addendumText, setAddendumText] = useState("");
  const [savingAddendum, setSavingAddendum] = useState(false);

  const fetchNotes = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("clinical_notes")
        .select("*, doctor:doctors(*)")
        .eq("patient_profile_id", id)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as ClinicalNote[];
      setNotes(rows);
      if (rows.length === 0) return;

      const { data: addenda } = await supabase
        .from("clinical_note_addenda")
        .select("*")
        .in("clinical_note_id", rows.map((n) => n.id))
        .order("created_at", { ascending: true });
      const grouped: Record<string, ClinicalNoteAddendum[]> = {};
      for (const a of (addenda ?? []) as ClinicalNoteAddendum[]) {
        (grouped[a.clinical_note_id] ??= []).push(a);
      }
      setAddendaByNote(grouped);

      const { data: signatures } = await supabase
        .from("clinical_note_signatures")
        .select("*")
        .in("clinical_note_id", rows.map((n) => n.id));
      const sigRows = (signatures ?? []) as ClinicalNoteSignature[];
      const sigMap: Record<string, ClinicalNoteSignature> = {};
      for (const s of sigRows) sigMap[s.clinical_note_id] = s;
      setSignaturesByNote(sigMap);

      const urls: Record<string, string | null> = {};
      await Promise.all(
        sigRows.map(async (s) => {
          urls[s.clinical_note_id] = await getClinicalPhotoUrl(s.signature_storage_path, s.storage_provider ?? "supabase");
        }),
      );
      setSignatureUrlsByNote(urls);
    },
    [supabase],
  );

  useEffect(() => {
    if (!patientProfileId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: docs }, { data: appts }] = await Promise.all([
        supabase.from("doctors").select("*").eq("is_active", true).order("name"),
        supabase
          .from("appointments")
          .select("id, start_at, status")
          .eq("contact_id", contactId)
          .order("start_at", { ascending: false })
          .limit(30),
        fetchNotes(patientProfileId),
      ]);
      if (cancelled) return;
      setDoctors((docs ?? []) as Doctor[]);
      setAppointments((appts ?? []) as Appointment[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientProfileId, contactId, supabase, fetchNotes]);

  async function handleSendForSignature(noteId: string) {
    setSendingSignatureFor(noteId);
    try {
      const res = await fetch(`/api/clinical-notes/${noteId}/send-for-signature`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      toast.success(t("signatureRequestSent", { email: data.sentTo }));
    } catch (err) {
      console.error("Send note for signature error:", err);
      toast.error(err instanceof Error ? err.message : t("signatureRequestFailed"));
    } finally {
      setSendingSignatureFor(null);
    }
  }

  function resetForm() {
    setNoteDoctorId("");
    setNoteAppointmentId("");
    setSubjective("");
    setObjective("");
    setAssessment("");
    setPlan("");
    setFormOpen(false);
  }

  async function saveNote() {
    if (!patientProfileId || !accountId || !subjective.trim() || !plan.trim()) {
      toast.error(t("noteRequired"));
      return;
    }
    setSavingNote(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error } = await supabase.from("clinical_notes").insert({
        account_id: accountId,
        patient_profile_id: patientProfileId,
        doctor_id: noteDoctorId || null,
        appointment_id: noteAppointmentId || null,
        // No separate "chief complaint" field in the SOAP form — the
        // Subjective text serves the same purpose, so it's mirrored
        // here to satisfy the existing NOT NULL column without a
        // schema change (see 131_soap_notes.sql).
        chief_complaint: subjective.trim(),
        findings_and_plan: plan.trim(),
        subjective: subjective.trim(),
        objective: objective.trim() || null,
        assessment: assessment.trim() || null,
        created_by: session?.user?.id ?? null,
      });
      if (error) throw error;
      toast.success(t("noteSigned"));
      resetForm();
      await fetchNotes(patientProfileId);
    } catch (err) {
      console.error("Save SOAP note error:", err);
      toast.error(t("noteSaveFailed"));
    } finally {
      setSavingNote(false);
    }
  }

  async function saveAddendum(noteId: string) {
    if (!accountId || !addendumText.trim() || !patientProfileId) return;
    setSavingAddendum(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error } = await supabase.from("clinical_note_addenda").insert({
        account_id: accountId,
        clinical_note_id: noteId,
        content: addendumText.trim(),
        created_by: session?.user?.id ?? null,
      });
      if (error) throw error;
      toast.success(t("addendumSaved"));
      setAddendumText("");
      setAddendumOpenFor(null);
      await fetchNotes(patientProfileId);
    } catch (err) {
      console.error("Save addendum error:", err);
      toast.error(t("addendumSaveFailed"));
    } finally {
      setSavingAddendum(false);
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

  if (!patientProfileId) {
    return <p className="text-sm text-muted-foreground">{t("noProfile")}</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t("title")}</p>
        {!formOpen && (
          <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            {t("newNote")}
          </Button>
        )}
      </div>

      {formOpen && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">{t("noteImmutableHint")}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("doctor")}</Label>
              <select
                value={noteDoctorId}
                onChange={(e) => setNoteDoctorId(e.target.value)}
                className="h-8 w-full rounded-md border border-border bg-muted px-2 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="">{t("selectDoctor")}</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("linkedAppointment")}</Label>
              <select
                value={noteAppointmentId}
                onChange={(e) => setNoteAppointmentId(e.target.value)}
                className="h-8 w-full rounded-md border border-border bg-muted px-2 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="">{t("noLinkedAppointment")}</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {dateFormatter.format(new Date(a.start_at))}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("subjective")}</Label>
            <Textarea
              value={subjective}
              onChange={(e) => setSubjective(e.target.value)}
              placeholder={t("subjectiveHint")}
              className="min-h-[56px] bg-muted text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("objective")}</Label>
            <Textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder={t("objectiveHint")}
              className="min-h-[56px] bg-muted text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("assessment")}</Label>
            <Textarea
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              placeholder={t("assessmentHint")}
              className="min-h-[44px] bg-muted text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("plan")}</Label>
            <Textarea
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder={t("planHint")}
              className="min-h-[64px] bg-muted text-xs"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={savingNote} className="flex-1 text-xs">
              {t("cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={saveNote}
              disabled={savingNote || !subjective.trim() || !plan.trim()}
              className="flex-1 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
            >
              {savingNote ? <Loader2 className="size-3.5 animate-spin" /> : t("signAndSave")}
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !formOpen && <p className="text-xs text-muted-foreground">{t("noNotes")}</p>}

      <div className="space-y-3">
        {notes.map((note) => (
          <div key={note.id} className="rounded-md border border-border bg-card px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">{dateFormatter.format(new Date(note.signed_at))}</span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                {t("signed")}
              </span>
            </div>
            {note.doctor?.name && <p className="text-xs text-muted-foreground">{t("authoredBy", { name: note.doctor.name })}</p>}

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SOAP_LETTERS.map(({ key, letter, labelKey }) => {
                const value = note[key];
                if (!value) return null;
                return (
                  <div key={key} className="rounded-md bg-muted/50 p-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="flex size-4 items-center justify-center rounded bg-primary/10 text-primary">{letter}</span>
                      {t(labelKey)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{value}</p>
                  </div>
                );
              })}
            </div>

            {(addendaByNote[note.id] ?? []).map((a) => (
              <div key={a.id} className="mt-2 rounded-md border-l-2 border-primary/40 bg-muted/50 px-2.5 py-2">
                <p className="text-[10px] font-medium text-muted-foreground">
                  {t("addendumLabel")} · {dateFormatter.format(new Date(a.created_at))}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-xs text-foreground">{a.content}</p>
              </div>
            ))}

            {addendumOpenFor === note.id ? (
              <div className="mt-2 space-y-1.5">
                <Textarea
                  value={addendumText}
                  onChange={(e) => setAddendumText(e.target.value)}
                  placeholder={t("addendumPlaceholder")}
                  className="min-h-[44px] bg-muted text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddendumOpenFor(null);
                      setAddendumText("");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveAddendum(note.id)}
                    disabled={savingAddendum || !addendumText.trim()}
                    className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50"
                  >
                    {savingAddendum ? t("saving") : t("saveAddendum")}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setAddendumOpenFor(note.id)} className="mt-2 text-xs text-primary hover:text-primary/80">
                {t("addAddendum")}
              </button>
            )}

            <div className="mt-2.5 border-t border-border/60 pt-2.5">
              {signaturesByNote[note.id] ? (
                <div className="flex items-center gap-2.5">
                  {signatureUrlsByNote[note.id] && (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URL to a private bucket
                    <img
                      src={signatureUrlsByNote[note.id]!}
                      alt=""
                      className="h-9 w-16 shrink-0 rounded border border-border bg-white object-contain"
                    />
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {t("signedByPatient", {
                      name: signaturesByNote[note.id].signer_name,
                      date: dateFormatter.format(new Date(signaturesByNote[note.id].signed_at)),
                    })}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendForSignature(note.id)}
                  disabled={sendingSignatureFor === note.id}
                  className="text-xs text-primary hover:text-primary/80 disabled:opacity-50"
                >
                  {sendingSignatureFor === note.id ? t("sendingSignatureRequest") : t("requestPatientSignature")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
