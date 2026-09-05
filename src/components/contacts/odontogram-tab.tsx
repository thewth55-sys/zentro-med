"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { OdontogramTooth, PatientProfile, Product, ToothCondition } from "@/types";

interface OdontogramTabProps {
  contactId: string;
}

// FDI/ISO two-digit numbering, laid out the way a chart is
// conventionally drawn (patient's right appears on the left of the
// page) — permanent adult dentition only, 32 teeth across 4 quadrants.
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

const CONDITIONS: ToothCondition[] = [
  "healthy",
  "caries",
  "filled",
  "crown",
  "root_canal",
  "missing",
  "extraction_planned",
  "implant",
  "bridge",
];

// Hex pairs (border/fill) lifted from the mockup for the 4 conditions
// it actually shows (caries, filled, crown, missing); the remaining 5
// conditions the mockup doesn't demo get colors picked to fit the same
// muted, pastel-fill language rather than plain Tailwind primaries.
const CONDITION_STYLE: Record<ToothCondition, string> = {
  healthy: "border-[#CBD6D0] bg-white",
  caries: "border-[#C0392F] bg-[#FBDDD8]",
  filled: "border-[#2563A8] bg-[#DCE8F7]",
  crown: "border-[#B4740A] bg-[#FAEBD2]",
  root_canal: "border-[#5B4A9E] bg-[#E7E1F6]",
  missing: "border-[#8A9A92] bg-[#E4E9E6]",
  extraction_planned: "border-[#CA8A04] bg-[#FEF3C7]",
  implant: "border-[#0E7C74] bg-[#DCEEEA]",
  bridge: "border-[#64748B] bg-[#E6E9ED]",
};

// Nomenclatura FDI estándar (posición dentro del cuadrante + cuadrante) —
// dato de referencia universal, no clínico del paciente, así que es
// seguro derivarlo de forma estática en vez de guardarlo por diente.
const TOOTH_QUADRANT_KEY: Record<number, string> = { 1: "q1", 2: "q2", 3: "q3", 4: "q4" };
const TOOTH_POSITION_KEY: Record<number, string> = {
  1: "p1", 2: "p2", 3: "p3", 4: "p4", 5: "p5", 6: "p6", 7: "p7", 8: "p8",
};

function toothAnatomicalName(fdi: number, t: (key: string) => string): string {
  const quadrant = Math.floor(fdi / 10);
  const position = fdi % 10;
  const positionKey = TOOTH_POSITION_KEY[position];
  const quadrantKey = TOOTH_QUADRANT_KEY[quadrant];
  if (!positionKey || !quadrantKey) return "";
  return `${t(`toothPosition.${positionKey}`)} ${t(`toothQuadrant.${quadrantKey}`)}`;
}

function ToothButton({
  number,
  tooth,
  selected,
  onClick,
}: {
  number: number;
  tooth?: OdontogramTooth;
  selected: boolean;
  onClick: () => void;
}) {
  const condition = tooth?.condition ?? "healthy";
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooth?.notes ?? undefined}
      className={cn(
        "flex w-8 shrink-0 flex-col items-center gap-[3px] rounded-lg border px-0 pb-[3px] pt-[5px] transition-colors",
        selected ? "border-[#0E7C4A] bg-[#E8F5EE]" : "border-transparent bg-transparent hover:bg-muted/60",
      )}
    >
      <span className={cn("block h-[22px] w-5 rounded border-[1.5px]", CONDITION_STYLE[condition])} />
      <span
        className={cn(
          "text-[9.5px] font-bold tabular-nums",
          selected ? "text-[#0A5C37]" : "text-muted-foreground",
        )}
      >
        {number}
      </span>
    </button>
  );
}

/**
 * Odontograma tab — current per-tooth status chart. Only available
 * once the contact has a patient_profiles row (migration 038's "a
 * contact becomes a patient when this row is created"); a lead that
 * hasn't been converted yet sees a pointer to the Médico tab instead.
 *
 * El detalle de un diente ya NO vive en un Popover flotante — es un
 * panel fijo debajo de la cuadrícula (mismo lugar siempre, coincide
 * con el mockup), para que quede visible sin tapar el resto del
 * odontograma mientras se registra un hallazgo.
 */
export function OdontogramTab({ contactId }: OdontogramTabProps) {
  const t = useTranslations("Contacts.detailView.odontogramTab");
  const supabase = createClient();
  const { accountId } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [teeth, setTeeth] = useState<Record<number, OdontogramTooth>>({});
  const [openTooth, setOpenTooth] = useState<number | null>(null);
  const [draftCondition, setDraftCondition] = useState<ToothCondition>("healthy");
  const [draftIcdCode, setDraftIcdCode] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Odontograma accionable
  const [products, setProducts] = useState<Product[]>([]);
  const [draftProductId, setDraftProductId] = useState("");
  const [draftUnitPrice, setDraftUnitPrice] = useState("");
  const [addingToQuote, setAddingToQuote] = useState(false);

  const fetchTeeth = useCallback(
    async (patientProfileId: string) => {
      const { data } = await supabase
        .from("odontogram_teeth")
        .select("*")
        .eq("patient_profile_id", patientProfileId);
      const map: Record<number, OdontogramTooth> = {};
      for (const row of (data ?? []) as OdontogramTooth[]) {
        map[row.tooth_number] = row;
      }
      setTeeth(map);
    },
    [supabase],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data }, { data: productsData }] = await Promise.all([
        supabase.from("patient_profiles").select("*").eq("contact_id", contactId).maybeSingle(),
        supabase.from("products").select("*").eq("is_active", true).order("name"),
      ]);
      if (cancelled) return;
      setProducts((productsData ?? []) as Product[]);
      const p = (data ?? null) as PatientProfile | null;
      setProfile(p);
      if (p) await fetchTeeth(p.id);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId, supabase, fetchTeeth]);

  function openToothEditor(toothNumber: number) {
    const existing = teeth[toothNumber];
    setDraftCondition(existing?.condition ?? "healthy");
    setDraftIcdCode(existing?.icd_code ?? "");
    setDraftNotes(existing?.notes ?? "");
    setDraftProductId("");
    setDraftUnitPrice("");
    setOpenTooth((current) => (current === toothNumber ? null : toothNumber));
  }

  async function saveTooth() {
    if (!profile || !accountId || openTooth === null) return;
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("odontogram_teeth")
        .upsert(
          {
            account_id: accountId,
            patient_profile_id: profile.id,
            tooth_number: openTooth,
            condition: draftCondition,
            icd_code: draftIcdCode.trim() || null,
            notes: draftNotes.trim() || null,
            updated_by: session?.user?.id ?? null,
          },
          { onConflict: "patient_profile_id,tooth_number" },
        )
        .select("*")
        .single();
      if (error) throw error;
      setTeeth((prev) => ({ ...prev, [openTooth]: data as OdontogramTooth }));
      toast.success(t("toothSaved"));
      // El panel se queda abierto — "odontograma accionable" necesita el
      // id recién guardado del diente para poder ligarlo a una línea de
      // cotización sin que el médico tenga que reabrirlo.
    } catch (err) {
      console.error("Save tooth error:", err);
      toast.error(t("toothSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function addToothToQuote() {
    const tooth = openTooth !== null ? teeth[openTooth] : undefined;
    const product = products.find((p) => p.id === draftProductId);
    if (!tooth?.id || !product) return;

    const unitPrice = Number(draftUnitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error(t("invalidCost"));
      return;
    }

    setAddingToQuote(true);
    try {
      const res = await fetch("/api/billing/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          items: [
            {
              product_id: product.id,
              description: t("quoteLineDescription", {
                tooth: tooth.tooth_number,
                condition: t(`conditions.${tooth.condition}`),
                product: product.name,
              }),
              quantity: 1,
              unit_price: unitPrice,
              odontogram_tooth_id: tooth.id,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "failed");
      toast.success(t("addedToQuote"));
      setOpenTooth(null);
      router.push("/billing");
    } catch (err) {
      console.error("Add tooth to quote error:", err);
      toast.error(t("addToQuoteFailed"));
    } finally {
      setAddingToQuote(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("noProfile")}</p>
      </div>
    );
  }

  const selectedTooth = openTooth !== null ? teeth[openTooth] : undefined;
  const selectedProduct = products.find((p) => p.id === draftProductId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {CONDITIONS.filter((c) => c !== "healthy").map((c) => (
            <span key={c} className="flex items-center gap-1">
              <span className={cn("size-2.5 rounded border", CONDITION_STYLE[c])} />
              {t(`conditions.${c}`)}
            </span>
          ))}
        </div>
      </div>

      {/* 16 dientes por fila a w-8 (32px) + gap-1 (4px) = 572px de ancho
          fijo — cabe sin scroll en el ancho real de esta tarjeta (el
          mockup mide igual). overflow-x-auto se deja solo como red de
          seguridad para una ventana angosta de verdad, no como el
          camino esperado; scrollbar-utilities por si acaso se activa. */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card p-4 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
        <div className="mx-auto flex w-fit flex-col items-center gap-1.5">
          <div className="flex gap-1">
            {[...UPPER_RIGHT, ...UPPER_LEFT].map((n) => (
              <ToothButton key={n} number={n} tooth={teeth[n]} selected={openTooth === n} onClick={() => openToothEditor(n)} />
            ))}
          </div>
          <div className="h-px w-[92%] bg-border" />
          <div className="flex gap-1">
            {[...LOWER_RIGHT, ...LOWER_LEFT].map((n) => (
              <ToothButton key={n} number={n} tooth={teeth[n]} selected={openTooth === n} onClick={() => openToothEditor(n)} />
            ))}
          </div>
        </div>
      </div>

      {openTooth !== null && (
        <div className="rounded-lg border border-border bg-card p-3.5">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-2.5">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("toothLabel", { number: openTooth })}</p>
                <p className="text-xs text-muted-foreground">
                  {toothAnatomicalName(openTooth, t)}
                  {" · "}
                  {selectedTooth ? t(`conditions.${selectedTooth.condition}`) : t("noFindings")}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("condition")}</Label>
                  <Select value={draftCondition} onValueChange={(v) => v && setDraftCondition(v as ToothCondition)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`conditions.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("icdCode")}</Label>
                  <Input
                    value={draftIcdCode}
                    onChange={(e) => setDraftIcdCode(e.target.value)}
                    placeholder={t("icdCodePlaceholder")}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("notes")}</Label>
                <Textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} rows={2} className="text-sm" />
              </div>
              <Button size="sm" onClick={saveTooth} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {t("save")}
              </Button>
            </div>

            {/* Solo aparece una vez que el hallazgo ya está guardado — la
                línea de cotización necesita el id real del diente para
                poder ligarse a él. */}
            {selectedTooth?.id && (
              <div className="w-full space-y-1.5 border-t border-border pt-3 sm:w-64 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("suggestedTreatment")}
                </Label>
                <p className="text-sm text-foreground">
                  {selectedProduct?.name ?? t("noTreatmentSelected")}
                  {" · "}
                  {draftUnitPrice || "—"}
                </p>
                <Select
                  value={draftProductId}
                  onValueChange={(v) => {
                    if (!v) return;
                    setDraftProductId(v);
                    const product = products.find((p) => p.id === v);
                    if (product) setDraftUnitPrice(String(product.unit_price));
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t("selectTreatment")}>
                      {(value: string) => products.find((p) => p.id === value)?.name ?? t("selectTreatment")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draftUnitPrice}
                  onChange={(e) => setDraftUnitPrice(e.target.value)}
                  placeholder={t("costPlaceholder")}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addToothToQuote}
                  disabled={addingToQuote || !draftProductId}
                  className="w-full"
                >
                  {addingToQuote ? <Loader2 className="size-3.5 animate-spin" /> : <Receipt className="size-3.5" />}
                  {t("addToQuote")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
