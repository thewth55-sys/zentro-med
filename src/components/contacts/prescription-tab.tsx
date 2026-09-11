"use client";

// ============================================================
// PrescriptionTab — "Receta" (Expediente Clínico tab 3 of 3).
// Free-text medication capture for v1 (no CUM/MIPRES catalog yet —
// confirmed scope). Signed at creation, immutable from that point on
// (migration 132) — there's a single "Firmar y emitir receta" action,
// no draft state, matching the approved mockup.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Mail, MessageCircle, Plus, Trash2 } from "lucide-react";
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
import { SignatureCaptureDialog } from "@/components/clinical/signature-capture-dialog";
import type { AccountCountry } from "@/lib/country";
import {
  checkAllergyConflict,
  getPrescriptionTypes,
  prescriptionDocTitle,
  prescriptionDocType,
  prescriptionNorma,
} from "@/lib/clinical/prescription-types";
import type { Doctor, Prescription } from "@/types";

interface PrescriptionTabProps {
  contactId: string;
  patientProfileId: string | null;
}

interface ItemDraft {
  generic_name: string;
  concentration: string;
  brand_name: string;
  presentation: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  quantity_to_dispense: string;
}

const EMPTY_ITEM: ItemDraft = {
  generic_name: "",
  concentration: "",
  brand_name: "",
  presentation: "",
  dose: "",
  route: "",
  frequency: "",
  duration: "",
  quantity_to_dispense: "",
};

export function PrescriptionTab({ contactId, patientProfileId }: PrescriptionTabProps) {
  const t = useTranslations("Contacts.detailView.prescriptionTab");
  const supabase = createClient();
  const { accountId, account } = useAuth();
  const country = (account?.country as AccountCountry) || "mx";
  const types = getPrescriptionTypes(country);

  const [loading, setLoading] = useState(!!patientProfileId);
  const [allergiesText, setAllergiesText] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sendingWhatsappId, setSendingWhatsappId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [patientEmail, setPatientEmail] = useState<string | null>(null);

  const [prescriptionType, setPrescriptionType] = useState(types[0]?.value ?? "simple");
  const [doctorId, setDoctorId] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([{ ...EMPTY_ITEM }]);
  const [indications, setIndications] = useState("");
  const [signing, setSigning] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);

  const load = useCallback(
    async (id: string) => {
      setLoading(true);
      // Flat queries + manual join in JS, not an embedded FK select —
      // `prescriptions`/`prescription_items` are brand-new tables
      // (migration 132) whose FKs can hit PostgREST's schema-cache
      // staleness (PGRST200) right after a migration, same reasoning
      // documented on `getCurrentAccount`/`AuthProvider.fetchProfile`.
      const [{ data: profile }, { data: contact }, { data: docs }, { data: rx }] = await Promise.all([
        supabase.from("patient_profiles").select("allergies").eq("id", id).maybeSingle(),
        supabase.from("contacts").select("email").eq("id", contactId).maybeSingle(),
        supabase.from("doctors").select("*").eq("is_active", true).order("name"),
        supabase
          .from("prescriptions")
          .select("*")
          .eq("patient_profile_id", id)
          .order("created_at", { ascending: false }),
      ]);
      setAllergiesText(profile?.allergies ?? null);
      setPatientEmail(contact?.email ?? null);
      setDoctors((docs ?? []) as Doctor[]);

      const rxRows = (rx ?? []) as Prescription[];
      if (rxRows.length > 0) {
        const { data: items } = await supabase
          .from("prescription_items")
          .select("*")
          .in("prescription_id", rxRows.map((r) => r.id))
          .order("position", { ascending: true });
        const itemsByRx: Record<string, Prescription["items"]> = {};
        for (const item of items ?? []) {
          (itemsByRx[item.prescription_id] ??= []).push(item);
        }
        for (const r of rxRows) r.items = itemsByRx[r.id] ?? [];
      }
      setPrescriptions(rxRows);
      setLoading(false);
    },
    [supabase, contactId],
  );

  useEffect(() => {
    if (!patientProfileId) {
      setLoading(false);
      return;
    }
    void load(patientProfileId);
  }, [patientProfileId, load]);

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const filledItems = items.filter((it) => it.generic_name.trim());
  const requisitos = [
    { key: "doctor", label: t("reqDoctor"), ok: !!doctorId },
    { key: "medication", label: t("reqMedication"), ok: filledItems.length > 0 },
    {
      key: "dosage",
      label: t("reqDosage"),
      ok: filledItems.every((it) => it.dose.trim() && it.route.trim() && it.frequency.trim() && it.duration.trim()),
    },
    { key: "indications", label: t("reqIndications"), ok: !!indications.trim() },
  ];
  const canSign = requisitos.every((r) => r.ok);

  // "Firmar y emitir receta" only opens the signature dialog — the
  // actual creation happens in handleSignatureConfirm below, once a
  // fresh signature is drawn. A stale/reused signature is exactly
  // what this two-step split is meant to prevent (see
  // 134_prescription_signature.sql).
  function handleSignClick() {
    if (!canSign) return;
    setSigning(true);
    setSignatureDialogOpen(true);
  }

  async function handleSignatureConfirm(signatureDataUrl: string) {
    if (!patientProfileId || !accountId) return;
    // Client-generated, unique per signing event — never reused, and
    // never derived from anything about the doctor or account, so it
    // can't be predicted or replayed for a different document.
    const token = crypto.randomUUID();
    try {
      const uploadRes = await fetch("/api/clinical/prescriptions/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl, token }),
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData.path) {
        throw new Error(uploadData?.error ?? "upload failed");
      }

      const { data: folio, error: folioError } = await supabase.rpc("next_billing_number", {
        p_account_id: accountId,
        p_doc_type: prescriptionDocType(country),
      });
      if (folioError || !folio) throw folioError ?? new Error("no folio");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data: created, error: insertError } = await supabase
        .from("prescriptions")
        .insert({
          account_id: accountId,
          patient_profile_id: patientProfileId,
          doctor_id: doctorId || null,
          prescription_type: prescriptionType,
          folio,
          country_at_issue: country,
          indications: indications.trim() || null,
          signature_storage_path: uploadData.path,
          verification_token: token,
          created_by: session?.user?.id ?? null,
        })
        .select("*")
        .single();
      if (insertError || !created) throw insertError ?? new Error("insert failed");

      const { error: itemsError } = await supabase.from("prescription_items").insert(
        filledItems.map((it, position) => ({
          account_id: accountId,
          prescription_id: created.id,
          position,
          generic_name: it.generic_name.trim(),
          concentration: it.concentration.trim() || null,
          brand_name: it.brand_name.trim() || null,
          presentation: it.presentation.trim() || null,
          dose: it.dose.trim() || null,
          route: it.route.trim() || null,
          frequency: it.frequency.trim() || null,
          duration: it.duration.trim() || null,
          quantity_to_dispense: it.quantity_to_dispense.trim() || null,
        })),
      );
      if (itemsError) throw itemsError;

      toast.success(t("issuedSuccess", { folio }));
      setPrescriptionType(types[0]?.value ?? "simple");
      setDoctorId("");
      setItems([{ ...EMPTY_ITEM }]);
      setIndications("");
      await load(patientProfileId);
    } catch (err) {
      console.error("Issue prescription error:", err);
      toast.error(t("issueFailed"));
      throw err; // keep the signature dialog open so the drawn signature isn't lost
    } finally {
      setSigning(false);
    }
  }

  async function generatePrescriptionPdf(prescriptionId: string): Promise<{ url: string; filename: string } | null> {
    const res = await fetch(`/api/clinical/prescriptions/${prescriptionId}/pdf`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      toast.error(data?.error ?? t("pdfFailed"));
      return null;
    }
    return { url: data.url, filename: data.filename };
  }

  async function downloadPdf(prescriptionId: string) {
    setDownloadingId(prescriptionId);
    try {
      const result = await generatePrescriptionPdf(prescriptionId);
      if (result) window.open(result.url, "_blank");
    } finally {
      setDownloadingId(null);
    }
  }

  async function sendWhatsapp(prescriptionId: string) {
    setSendingWhatsappId(prescriptionId);
    try {
      const result = await generatePrescriptionPdf(prescriptionId);
      if (!result) return;
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          message_type: "document",
          media_url: result.url,
          filename: result.filename,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? t("whatsappSendFailed"));
        return;
      }
      toast.success(t("whatsappSendSuccess"));
    } finally {
      setSendingWhatsappId(null);
    }
  }

  async function sendEmail(prescriptionId: string) {
    setSendingEmailId(prescriptionId);
    try {
      const res = await fetch(`/api/clinical/prescriptions/${prescriptionId}/send-email`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? t("emailSendFailed"));
        return;
      }
      toast.success(t("emailSendSuccess"));
    } finally {
      setSendingEmailId(null);
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
    <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-3">
              <p className="text-sm font-semibold">{t("typeTitle")}</p>
              <span className="text-xs text-muted-foreground">{prescriptionNorma(country)}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {types.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrescriptionType(opt.value)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    prescriptionType === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <p className="font-medium">{opt.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{opt.meta}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-semibold">{t("medicationsTitle")}</p>
            <div className="flex flex-col gap-3">
              {items.map((item, index) => {
                const allergyHit = checkAllergyConflict(item.generic_name, allergiesText);
                return (
                  <div key={index} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-start gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("genericName")}</Label>
                        <Input
                          value={item.generic_name}
                          onChange={(e) => updateItem(index, { generic_name: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="w-32 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("concentration")}</Label>
                        <Input
                          value={item.concentration}
                          onChange={(e) => updateItem(index, { concentration: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-6 size-9 shrink-0 text-destructive"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>

                    {allergyHit && (
                      <div className="mb-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        {t("allergyWarning")}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("presentation")}</Label>
                        <Input
                          value={item.presentation}
                          onChange={(e) => updateItem(index, { presentation: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("dose")}</Label>
                        <Input value={item.dose} onChange={(e) => updateItem(index, { dose: e.target.value })} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("route")}</Label>
                        <Input value={item.route} onChange={(e) => updateItem(index, { route: e.target.value })} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("frequency")}</Label>
                        <Input
                          value={item.frequency}
                          onChange={(e) => updateItem(index, { frequency: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("duration")}</Label>
                        <Input
                          value={item.duration}
                          onChange={(e) => updateItem(index, { duration: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("quantity")}</Label>
                        <Input
                          value={item.quantity_to_dispense}
                          onChange={(e) => updateItem(index, { quantity_to_dispense: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("brandName")}</Label>
                        <Input
                          value={item.brand_name}
                          onChange={(e) => updateItem(index, { brand_name: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="self-start">
                <Plus className="mr-1.5 size-3.5" />
                {t("addMedication")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-semibold">{t("indicationsTitle")}</p>
            <Textarea
              value={indications}
              onChange={(e) => setIndications(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </CardContent>
        </Card>

        {prescriptions.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="mb-3 text-sm font-semibold">{t("historyTitle")}</p>
              <div className="flex flex-col gap-2">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {rx.folio} · {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(rx.signed_at))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(rx.items ?? []).map((it) => it.generic_name).join(", ")}
                      </p>
                    </div>
                    <div className="ml-auto flex shrink-0 gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPdf(rx.id)}
                        disabled={downloadingId === rx.id}
                      >
                        {downloadingId === rx.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          t("downloadPdf")
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title={t("sendWhatsapp")}
                        onClick={() => sendWhatsapp(rx.id)}
                        disabled={sendingWhatsappId === rx.id}
                      >
                        {sendingWhatsappId === rx.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <MessageCircle className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title={t("sendEmail")}
                        onClick={() => sendEmail(rx.id)}
                        disabled={sendingEmailId === rx.id || !patientEmail}
                      >
                        {sendingEmailId === rx.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Mail className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("legalValidityTitle")}</h3>
              <Badge variant={canSign ? "success" : "warning"}>{canSign ? t("valid") : t("incomplete")}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{prescriptionDocTitle(country)}</p>
            <div className="mt-3 flex flex-col gap-2">
              {requisitos.map((r) => (
                <div key={r.key} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className={`size-3.5 shrink-0 ${r.ok ? "text-emerald-600" : "text-muted-foreground/40"}`} />
                  <span className={r.ok ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">{t("signatureEveryTimeNote")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">{t("issueTitle")}</h3>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">{t("prescribingDoctor")}</Label>
              <Select value={doctorId} onValueChange={(v) => v && setDoctorId(v)}>
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
              <Button className="mt-2" onClick={handleSignClick} disabled={signing || !canSign}>
                {signing && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                {t("signAndIssue")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <SignatureCaptureDialog
        open={signatureDialogOpen}
        onOpenChange={(next) => {
          setSignatureDialogOpen(next);
          if (!next) setSigning(false);
        }}
        title={t("signDialogTitle")}
        description={t("signDialogDescription")}
        confirmLabel={t("signAndIssue")}
        onConfirm={handleSignatureConfirm}
      />
    </div>
  );
}
