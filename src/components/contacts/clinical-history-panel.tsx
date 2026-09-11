"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import type { ClinicalNote } from "@/types";

interface Props {
  /** null mientras no exista `patient_profiles` para este contacto —
   *  ver medical-tab.tsx: sin perfil no hay dónde colgar una nota clínica. */
  patientProfileId: string | null;
}

/**
 * "Historial clínico" del mockup — resumen de solo lectura de las
 * notas de evolución más recientes. Ya NO tiene alta rápida ni
 * adenda/firma propias — toda la escritura se consolidó en la
 * pestaña "Notas de evolución" (soap-notes-tab.tsx) para no tener dos
 * UIs distintas escribiendo en `clinical_notes` (ver migración 131).
 */
export function ClinicalHistoryPanel({ patientProfileId }: Props) {
  const t = useTranslations("Contacts.detailView.clinicalHistory");
  const supabase = createClient();

  const [loading, setLoading] = useState(!!patientProfileId);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);

  const fetchNotes = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("clinical_notes")
        .select("*, doctor:doctors(*)")
        .eq("patient_profile_id", id)
        .order("signed_at", { ascending: false })
        .limit(5);
      setNotes((data ?? []) as ClinicalNote[]);
    },
    [supabase],
  );

  useEffect(() => {
    if (!patientProfileId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchNotes(patientProfileId);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientProfileId, fetchNotes]);

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("title")}</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{t("goToEvolutionNotes")}</p>

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
                  <p className="text-sm font-medium text-foreground">{note.subjective || note.chief_complaint}</p>
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
