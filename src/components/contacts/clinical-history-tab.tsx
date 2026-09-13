"use client";

// ============================================================
// ClinicalHistoryTab — "Historia clínica" (Expediente Clínico tab 1
// of 3). One document per patient (migration 130): freely editable
// while `signed_at` is null, permanently locked once signed. Section
// and field definitions are country-aware (see
// src/lib/clinical/history-sections.ts) but resolved from
// `account.country` — there is no manual MX/CO toggle in this UI.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showsOdontogram } from "@/lib/specialties";
import type { AccountCountry } from "@/lib/country";
import {
  HISTORY_SECTIONS,
  computeCompletion,
  computeSectionCompletion,
  getRetentionInfo,
  fieldLabel,
  fieldRequired,
} from "@/lib/clinical/history-sections";
import type { ClinicalHistoryRecord, Doctor } from "@/types";

interface ClinicalHistoryTabProps {
  contactId: string;
  patientProfileId: string | null;
}

type Sections = Record<string, Record<string, string>>;

export function ClinicalHistoryTab({ contactId, patientProfileId }: ClinicalHistoryTabProps) {
  const t = useTranslations("Contacts.detailView.clinicalHistoryTab");
  const supabase = createClient();
  const { accountId, account } = useAuth();
  const country = (account?.country as AccountCountry) || "mx";

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<ClinicalHistoryRecord | null>(null);
  const [sections, setSections] = useState<Sections>({});
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [signingDoctorId, setSigningDoctorId] = useState("");
  const [odontogramFindings, setOdontogramFindings] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);

  const isSigned = !!record?.signed_at;

  const load = useCallback(
    async (id: string) => {
      setLoading(true);
      const [{ data: existing }, { data: docs }] = await Promise.all([
        supabase.from("clinical_history_records").select("*").eq("patient_profile_id", id).maybeSingle(),
        supabase.from("doctors").select("*").eq("is_active", true).order("name"),
      ]);
      setDoctors((docs ?? []) as Doctor[]);

      if (existing) {
        const row = existing as ClinicalHistoryRecord;
        setRecord(row);
        setSections((row.sections as Sections) ?? {});
      } else if (accountId) {
        // Lazily create the draft the first time this tab is opened for
        // a patient — mirrors the mockup's assumption that a "historia
        // clínica de primera vez" is always in progress rather than
        // showing an extra "start" step. Seeded (not empty) from data
        // the patient's own record already has — a QA finding: the
        // form used to arrive at 0% complete demanding recapture of
        // name/birth date/sex/etc. that contacts/patient_profiles
        // already store. The professional can still correct anything
        // before signing.
        const [{ data: contactRow }, { data: profileRow }] = await Promise.all([
          supabase.from("contacts").select("name, phone, address").eq("id", contactId).maybeSingle(),
          supabase
            .from("patient_profiles")
            .select(
              "birth_date, sex, document_type, document_number, birth_country, occupation, insurance_provider, emergency_contact_name, emergency_contact_phone",
            )
            .eq("id", id)
            .maybeSingle(),
        ]);

        const identification: Record<string, string> = {};
        if (contactRow?.name) identification.full_name = contactRow.name;
        if (contactRow?.phone) identification.phone = contactRow.phone;
        if (contactRow?.address) identification.address = contactRow.address;
        if (profileRow?.birth_date) identification.birth_date = profileRow.birth_date;
        if (profileRow?.sex) identification.sex = profileRow.sex;
        if (profileRow?.document_number) identification.id_document = profileRow.document_number;
        if (profileRow?.birth_country) identification.birth_place = profileRow.birth_country;
        if (profileRow?.occupation) identification.occupation = profileRow.occupation;
        if (profileRow?.insurance_provider) identification.coverage = profileRow.insurance_provider;
        if (profileRow?.emergency_contact_name || profileRow?.emergency_contact_phone) {
          identification.emergency_contact = [
            profileRow?.emergency_contact_name,
            profileRow?.emergency_contact_phone,
          ]
            .filter(Boolean)
            .join(" · ");
        }

        const seededSections: Sections =
          Object.keys(identification).length > 0 ? { identification } : {};

        const { data: created, error } = await supabase
          .from("clinical_history_records")
          .insert({ account_id: accountId, patient_profile_id: id, sections: seededSections })
          .select("*")
          .single();
        if (!error && created) {
          setRecord(created as ClinicalHistoryRecord);
          setSections(seededSections);
        }
      }

      if (showsOdontogram(account?.specialty)) {
        const { count } = await supabase
          .from("odontogram_teeth")
          .select("id", { count: "exact", head: true })
          .eq("patient_profile_id", id)
          .neq("condition", "healthy");
        setOdontogramFindings(count ?? 0);
      }

      setLoading(false);
    },
    [supabase, accountId, account?.specialty, contactId],
  );

  useEffect(() => {
    if (!patientProfileId) {
      setLoading(false);
      return;
    }
    void load(patientProfileId);
  }, [patientProfileId, load]);

  function setFieldValue(sectionKey: string, fieldKey: string, value: string) {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [fieldKey]: value },
    }));
  }

  async function saveDraft() {
    if (!record) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clinical_history_records")
        .update({ sections })
        .eq("id", record.id);
      if (error) throw error;
      toast.success(t("draftSaved"));
    } catch (err) {
      console.error("Save clinical history draft error:", err);
      toast.error(t("draftSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const { percent, missing } = computeCompletion(sections, country);

  async function signAndClose() {
    if (!record || missing.length > 0 || !signingDoctorId) return;
    setSigning(true);
    try {
      const { data, error } = await supabase
        .from("clinical_history_records")
        .update({
          sections,
          signed_at: new Date().toISOString(),
          signed_by_doctor_id: signingDoctorId,
          country_at_signing: country,
        })
        .eq("id", record.id)
        .select("*")
        .single();
      if (error) throw error;
      setRecord(data as ClinicalHistoryRecord);
      toast.success(t("signedSuccess"));
    } catch (err) {
      console.error("Sign clinical history error:", err);
      toast.error(t("signFailed"));
    } finally {
      setSigning(false);
    }
  }

  if (!patientProfileId) {
    return <p className="text-sm text-muted-foreground">{t("noProfile")}</p>;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t("title")}</p>
                <p className="text-xs text-muted-foreground">
                  {isSigned ? t("normaSignedTexto") : t("normaTexto")}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                {isSigned ? (
                  <Badge variant="success">{t("signedBadge")}</Badge>
                ) : (
                  <>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {t("completedLabel")}
                      </div>
                      <div className="text-sm font-bold text-primary">{percent}%</div>
                    </div>
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {HISTORY_SECTIONS.map((section, index) => {
          const { complete: sectionComplete, missingCount } = computeSectionCompletion(section, sections, country);
          return (
          <Card key={section.key}>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{section.title}</p>
                  <p className="text-xs text-muted-foreground">{section.metaByCountry[country]}</p>
                </div>
                {!isSigned && (
                  <Badge variant={sectionComplete ? "success" : "warning"} className="ml-auto shrink-0">
                    {sectionComplete ? t("sectionComplete") : t("sectionMissing", { count: missingCount })}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {section.fields.map((field) => {
                  if (field.derived === "odontogram_summary") {
                    if (!showsOdontogram(account?.specialty)) return null;
                    return (
                      <div
                        key={field.key}
                        className="flex flex-col gap-1.5"
                        style={{ gridColumn: field.span ? `span ${field.span}` : undefined }}
                      >
                        <Label className="text-xs text-muted-foreground">{fieldLabel(field, country)}</Label>
                        <p className="text-sm">
                          {odontogramFindings === null
                            ? t("odontogramUnknown")
                            : t("odontogramFindings", { count: odontogramFindings })}
                        </p>
                      </div>
                    );
                  }
                  const value = sections[section.key]?.[field.key] ?? "";
                  const required = fieldRequired(field, country);
                  return (
                    <div
                      key={field.key}
                      className="flex flex-col gap-1.5"
                      style={{ gridColumn: field.span ? `span ${field.span}` : undefined }}
                    >
                      <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                        {fieldLabel(field, country)}
                        {required && <span className="text-destructive">●</span>}
                      </Label>
                      {field.multiline ? (
                        <Textarea
                          value={value}
                          disabled={isSigned}
                          onChange={(e) => setFieldValue(section.key, field.key, e.target.value)}
                          className="min-h-[70px] text-sm"
                        />
                      ) : (
                        <Input
                          value={value}
                          disabled={isSigned}
                          onChange={(e) => setFieldValue(section.key, field.key, e.target.value)}
                          className="h-9 text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          );
        })}

        {!isSigned && (
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t("signCardTitle")}</p>
                <p className="max-w-[520px] text-xs text-muted-foreground">{t("signCardHint")}</p>
              </div>
              <div className="ml-auto flex shrink-0 gap-2">
                <Button variant="outline" onClick={saveDraft} disabled={saving}>
                  {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                  {t("saveDraft")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {!isSigned && (
          <>
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-1 text-sm font-semibold">{t("missingTitle")}</h3>
                <p className="text-xs text-muted-foreground">{t("missingHint")}</p>
                <div className="mt-3 flex flex-col gap-2">
                  {missing.length === 0 ? (
                    <p className="flex items-center gap-2 text-xs text-emerald-600">
                      <CheckCircle2 className="size-3.5" />
                      {t("missingNone")}
                    </p>
                  ) : (
                    missing.map(({ section, field }) => (
                      <div
                        key={`${section.key}.${field.key}`}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30"
                      >
                        <p className="text-xs font-semibold">{fieldLabel(field, country)}</p>
                        <p className="text-[11px] text-muted-foreground">{section.title}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">{t("signAndCloseTitle")}</h3>
                <div className="flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground">{t("signingDoctor")}</Label>
                  <Select value={signingDoctorId} onValueChange={(v) => v && setSigningDoctorId(v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t("selectDoctor")}>
                        {(value: string | null) => doctors.find((d) => d.id === value)?.name ?? t("selectDoctor")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="mt-2"
                    onClick={signAndClose}
                    disabled={signing || missing.length > 0 || !signingDoctorId}
                  >
                    {signing && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                    {t("signAndClose")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">{t("retentionTitle")}</h3>
            <div className="flex flex-col gap-2">
              {getRetentionInfo(country).map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
