"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, Stethoscope } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { useCan } from "@/hooks/use-can";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ServiceType, ServiceTypeCategory } from "@/types";

const CATEGORIES: ServiceTypeCategory[] = [
  "diagnostic",
  "preventive",
  "restorative",
  "rehabilitation",
  "esthetic",
  "orthodontics",
  "other",
];
const CATEGORY_STYLES: Record<ServiceTypeCategory, string> = {
  diagnostic: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  preventive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  restorative: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rehabilitation: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  esthetic: "bg-red-500/10 text-red-600 dark:text-red-400",
  orthodontics: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  other: "bg-muted text-muted-foreground",
};

const STALE_PRICE_DAYS = 90;
const TOP_N_FOR_INSIGHT = 5;
const DAY_MS = 86_400_000;

export function PricingCatalog() {
  const t = useTranslations("Billing.pricing");
  const tSt = useTranslations("Settings.scheduling.serviceTypes");
  const { accountId, defaultCurrency } = useAuth();
  const canEdit = useCan("edit-settings");
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [treatments, setTreatments] = useState<ServiceType[]>([]);
  const [avgTicket, setAvgTicket] = useState<number | null>(null);
  const [insight, setInsight] = useState<{ name: string; months: number; rank: number } | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<ServiceTypeCategory>("other");
  const [newDuration, setNewDuration] = useState("30");
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTreatments = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_types")
        .select("*, product:products(*)")
        .eq("account_id", accountId)
        .order("name", { ascending: true });
      if (error) throw error;
      setTreatments((data ?? []) as ServiceType[]);
    } catch (err) {
      console.error("Failed to fetch treatments:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [accountId, supabase, t]);

  useEffect(() => {
    void fetchTreatments();
  }, [fetchTreatments]);

  useEffect(() => {
    if (!accountId) return;
    (async () => {
      const { data } = await supabase
        .from("invoices")
        .select("total")
        .eq("account_id", accountId)
        .not("status", "in", "(draft,void)");
      const rows = (data ?? []) as { total: number }[];
      setAvgTicket(rows.length > 0 ? rows.reduce((sum, r) => sum + Number(r.total), 0) / rows.length : null);
    })();
  }, [accountId, supabase]);

  // "Zen detectó" — a real computed nudge, not a fabricated one: among
  // the treatments actually billed the most (by revenue, via their
  // linked product's invoice line items), find the one whose price
  // hasn't moved in the longest time. Hidden entirely if nothing
  // qualifies rather than showing a made-up insight.
  useEffect(() => {
    if (!accountId || treatments.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("invoice_items")
        .select("product_id, line_total")
        .eq("account_id", accountId)
        .not("product_id", "is", null);
      const revenueByProduct = new Map<string, number>();
      for (const row of (data ?? []) as { product_id: string; line_total: number }[]) {
        revenueByProduct.set(row.product_id, (revenueByProduct.get(row.product_id) ?? 0) + Number(row.line_total));
      }
      const ranked = treatments
        .filter((tr) => tr.product_id && revenueByProduct.has(tr.product_id))
        .map((tr) => ({ treatment: tr, revenue: revenueByProduct.get(tr.product_id!) ?? 0 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, TOP_N_FOR_INSIGHT);

      let stalest: { name: string; months: number; rank: number } | null = null;
      ranked.forEach((entry, i) => {
        const updatedAt = entry.treatment.product?.updated_at ?? entry.treatment.updated_at;
        if (!updatedAt) return;
        const days = (Date.now() - new Date(updatedAt).getTime()) / DAY_MS;
        if (days < STALE_PRICE_DAYS) return;
        const months = Math.floor(days / 30);
        if (!stalest || months > stalest.months) {
          stalest = { name: entry.treatment.name, months, rank: i + 1 };
        }
      });
      setInsight(stalest);
    })();
  }, [accountId, treatments, supabase]);

  const activeCount = useMemo(() => treatments.filter((tr) => tr.is_active).length, [treatments]);
  const visibleCount = useMemo(() => treatments.filter((tr) => tr.is_active && tr.visible_in_booking).length, [treatments]);

  async function syncPrice(treatment: ServiceType, price: number | null) {
    const { error } = await supabase.from("service_types").update({ price }).eq("id", treatment.id);
    if (error) {
      console.error("Update treatment price error:", error);
      toast.error(t("updateFailed"));
      return;
    }
    if (price == null) {
      setTreatments((prev) => prev.map((tr) => (tr.id === treatment.id ? { ...tr, price } : tr)));
      return;
    }
    if (treatment.product_id) {
      await supabase.from("products").update({ unit_price: price }).eq("id", treatment.product_id);
      setTreatments((prev) =>
        prev.map((tr) =>
          tr.id === treatment.id ? { ...tr, price, product: tr.product ? { ...tr.product, unit_price: price } : tr.product } : tr,
        ),
      );
    } else {
      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({ account_id: accountId, name: treatment.name, unit_price: price })
        .select("*")
        .single();
      if (productError || !product) {
        console.error("Create linked product error:", productError);
        toast.error(t("updateFailed"));
        return;
      }
      await supabase.from("service_types").update({ product_id: product.id }).eq("id", treatment.id);
      setTreatments((prev) =>
        prev.map((tr) => (tr.id === treatment.id ? { ...tr, price, product_id: product.id, product } : tr)),
      );
    }
  }

  async function toggleBookingVisible(treatment: ServiceType) {
    const { error } = await supabase
      .from("service_types")
      .update({ visible_in_booking: !treatment.visible_in_booking })
      .eq("id", treatment.id);
    if (error) {
      console.error("Toggle booking visibility error:", error);
      toast.error(t("updateFailed"));
      return;
    }
    setTreatments((prev) =>
      prev.map((tr) => (tr.id === treatment.id ? { ...tr, visible_in_booking: !tr.visible_in_booking } : tr)),
    );
  }

  async function updateCategory(treatment: ServiceType, category: ServiceTypeCategory) {
    const { error } = await supabase.from("service_types").update({ category }).eq("id", treatment.id);
    if (error) {
      console.error("Update treatment category error:", error);
      toast.error(t("updateFailed"));
      return;
    }
    setTreatments((prev) => prev.map((tr) => (tr.id === treatment.id ? { ...tr, category } : tr)));
  }

  async function handleCreate() {
    if (!newName.trim() || !accountId) {
      toast.error(tSt("namePlaceholder"));
      return;
    }
    setSaving(true);
    try {
      const price = newPrice.trim() ? Number(newPrice) : null;
      const { data: created, error } = await supabase
        .from("service_types")
        .insert({
          account_id: accountId,
          name: newName.trim(),
          category: newCategory,
          duration_minutes: Number(newDuration) || 30,
          price,
        })
        .select("*")
        .single();
      if (error || !created) throw error ?? new Error("failed");
      if (price && price > 0) {
        const { data: product } = await supabase
          .from("products")
          .insert({ account_id: accountId, name: newName.trim(), unit_price: price })
          .select("id")
          .single();
        if (product) {
          await supabase.from("service_types").update({ product_id: product.id }).eq("id", created.id);
        }
      }
      toast.success(t("created"));
      setNewOpen(false);
      setNewName("");
      setNewCategory("other");
      setNewDuration("30");
      setNewPrice("");
      await fetchTreatments();
    } catch (err) {
      console.error("Create treatment error:", err);
      toast.error(t("createFailed"));
    } finally {
      setSaving(false);
    }
  }

  const durationFormatter = (minutes: number) => tSt("minutes", { count: minutes });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_292px] lg:items-start">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {treatments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Stethoscope className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-[1.9fr_1.3fr_0.9fr_1fr_100px] gap-3 bg-muted/40 px-4 py-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">
              <span>{t("columns.treatment")}</span>
              <span>{t("columns.category")}</span>
              <span>{t("columns.duration")}</span>
              <span className="text-right">{t("columns.price")}</span>
              <span className="text-center">{t("columns.booking")}</span>
            </div>
            {treatments.map((treatment) => (
              <div
                key={treatment.id}
                className="grid min-w-[720px] grid-cols-[1.9fr_1.3fr_0.9fr_1fr_100px] items-center gap-3 border-t border-border px-4 py-3"
              >
                <p className="truncate text-sm font-semibold text-foreground">{treatment.name}</p>
                <select
                  value={treatment.category}
                  onChange={(e) => updateCategory(treatment, e.target.value as ServiceTypeCategory)}
                  disabled={!canEdit}
                  className={`h-7 w-fit rounded-full border-0 px-2.5 text-[11px] font-bold outline-none disabled:opacity-70 ${CATEGORY_STYLES[treatment.category]}`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`categories.${c}`)}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">{durationFormatter(treatment.duration_minutes)}</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={treatment.price ?? ""}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const value = raw ? Number(raw) : null;
                    if (value === (treatment.price ?? null)) return;
                    if (value !== null && (!Number.isFinite(value) || value < 0)) return;
                    void syncPrice(treatment, value);
                  }}
                  disabled={!canEdit}
                  placeholder={tSt("noPrice")}
                  className="h-8 text-right text-sm font-bold"
                />
                <div className="flex justify-center">
                  <Switch checked={treatment.visible_in_booking} onCheckedChange={() => toggleBookingVisible(treatment)} disabled={!canEdit} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-foreground">{t("catalog.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("catalog.subtitle")}</p>
            <div className="mt-3.5 flex flex-col gap-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t("catalog.activeTreatments")}</span>
                <span className="font-semibold text-foreground tabular-nums">{activeCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t("catalog.visibleInBooking")}</span>
                <span className="font-semibold text-foreground tabular-nums">{visibleCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t("catalog.avgTicket")}</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {avgTicket != null ? formatCurrency(avgTicket, defaultCurrency) : "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {insight && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="mb-1.5 flex items-center gap-2">
                <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{t("insight.title")}</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground">
                {t("insight.body", { name: insight.name, months: insight.months, rank: insight.rank })}
              </p>
            </CardContent>
          </Card>
        )}

        {canEdit && (
          <Button type="button" variant="outline" onClick={() => setNewOpen(true)} className="border-dashed">
            <Plus className="size-4" />
            {t("newTreatment")}
          </Button>
        )}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("newTreatment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tSt("namePlaceholder")}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("columns.category")}</Label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ServiceTypeCategory)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`categories.${c}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tSt("durationLabel")}</Label>
                <Input type="number" min={1} value={newDuration} onChange={(e) => setNewDuration(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tSt("priceLabel")}</Label>
                <Input type="number" min={0} step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder={tSt("pricePlaceholder")} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewOpen(false)} disabled={saving}>
              {tSt("cancel")}
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
