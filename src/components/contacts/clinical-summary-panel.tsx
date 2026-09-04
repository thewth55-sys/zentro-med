import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  allergies: string | null;
  chronicConditions: string | null;
  currentMedications: string | null;
}

/**
 * "Resumen clínico" del mockup — deliberadamente solo 3 campos reales
 * (patient_profiles.allergies / chronic_conditions / current_medications,
 * todos texto libre). El mockup también mostraba Diabetes/Embarazo
 * (no existen como booleanos) y "Última Rx" (no hay forma de distinguir
 * una radiografía de cualquier otra foto clínica) — se decidió NO
 * fabricarlos, ver decisión del usuario en la sesión que agregó esto.
 */
export function ClinicalSummaryPanel({ allergies, chronicConditions, currentMedications }: Props) {
  const t = useTranslations("Contacts.detailView.clinicalSummary");

  const hasAnything = !!(allergies || chronicConditions || currentMedications);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>

      {allergies && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">{t("allergyLabel")}</p>
            <p className="text-sm text-red-600/90 dark:text-red-400/90">{allergies}</p>
          </div>
        </div>
      )}

      {!hasAnything ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("medicationLabel")}
            </p>
            <p className="text-sm text-foreground">{currentMedications || t("none")}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("chronicConditionsLabel")}
            </p>
            <p className="text-sm text-foreground">{chronicConditions || t("none")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
