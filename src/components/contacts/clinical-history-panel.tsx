"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ClinicalNote, Doctor } from "@/types";

interface Props {
  /** null mientras no exista `patient_profiles` para este contacto —
   *  ver medical-tab.tsx: sin perfil no hay dónde colgar una nota clínica. */
  patientProfileId: string | null;
}

/**
 * "Historial clínico" del mockup — timeline de notas clínicas
 * firmadas. Deliberadamente respaldado SOLO por `clinical_notes` (lo
 * único que ya existe y encaja: fecha+autor+título+descripción); no
 * fabrica un log de actividad genérico (altas de expediente, consentimientos
 * firmados, etc. — el mockup mezcla esos pero no hay tabla real para eso).
 * Adenda/firma del paciente sobre una nota siguen viviendo solo en el
 * tab Médico — este panel es de solo lectura + alta de nota nueva.
 */
export function ClinicalHistoryPanel({ patientProfileId }: Props) {
  const t = useTranslations("Contacts.detailView.clinicalHistory");
  const supabase = createClient();
  const { accountId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [findingsAndPlan, setFindingsAndPlan] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("clinical_notes")
        .select("*, doctor:doctors(*)")
        .eq("patient_profile_id", id)
        .order("signed_at", { ascending: false })
        .limit(10);
      setNotes((data ?? []) as ClinicalNote[]);
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
      const [{ data: docs }] = await Promise.all([
        supabase.from("doctors").select("*").eq("is_active", true).order("name"),
        fetchNotes(patientProfileId),
      ]);
      if (cancelled) return;
      setDoctors((docs ?? []) as Doctor[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientProfileId, supabase, fetchNotes]);

  async function saveNote() {
    if (!patientProfileId || !accountId || !chiefComplaint.trim() || !findingsAndPlan.trim()) {
      toast.error(t("noteRequired"));
      return;
    }
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error } = await supabase.from("clinical_notes").insert({
        account_id: accountId,
        patient_profile_id: patientProfileId,
        doctor_id: doctorId || null,
        chief_complaint: chiefComplaint.trim(),
        findings_and_plan: findingsAndPlan.trim(),
        created_by: session?.user?.id ?? null,
      });
      if (error) throw error;
      toast.success(t("noteSigned"));
      setChiefComplaint("");
      setFindingsAndPlan("");
      setDoctorId("");
      setFormOpen(false);
      await fetchNotes(patientProfileId);
    } catch (err) {
      console.error("Save clinical note error:", err);
      toast.error(t("noteSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        {patientProfileId && !formOpen && (
          <Button variant="ghost" size="sm" onClick={() => setFormOpen(true)} className="h-7 text-xs">
            <Plus className="mr-1 size-3.5" />
            {t("newNote")}
          </Button>
        )}
      </div>

      {formOpen && (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/40 p-2.5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("doctor")}</Label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-primary"
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
            <Label className="text-xs text-muted-foreground">{t("chiefComplaint")}</Label>
            <Textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              className="min-h-[44px] bg-card text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("findingsAndPlan")}</Label>
            <Textarea
              value={findingsAndPlan}
              onChange={(e) => setFindingsAndPlan(e.target.value)}
              className="min-h-[64px] bg-card text-xs"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={saving} className="flex-1 text-xs">
              {t("cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={saveNote}
              disabled={saving || !chiefComplaint.trim() || !findingsAndPlan.trim()}
              className="flex-1 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : t("signAndSave")}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : !patientProfileId ? (
          <p className="text-xs text-muted-foreground">{t("noProfile")}</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("noNotes")}</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="flex gap-2.5">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">
                    {dateFormatter.format(new Date(note.signed_at))}
                    {note.doctor?.name ? ` · ${note.doctor.name}` : ""}
                  </p>
                  <p className="text-sm font-medium text-foreground">{note.chief_complaint}</p>
                  <p className="text-xs text-muted-foreground">{note.findings_and_plan}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
