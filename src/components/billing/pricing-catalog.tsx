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
import type { PriceCategory, Product, ServiceType } from "@/types";

const CATEGORIES: PriceCategory[] = [
  "diagnostic",
  "preventive",
  "restorative",
  "rehabilitation",
  "esthetic",
  "orthodontics",
  "other",
];
const CATEGORY_STYLES: Record<PriceCategory, string> = {
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

/** A unified catalog row — either a scheduled treatment (`service_types`,
 *  has a duration and a booking-page toggle) or a plain billable item
 *  (`products`, no duration, never shown on the booking page). Both
 *  share the same name/category/price shape in this table. */
interface PriceRow {
  id: string;
  kind: "treatment" | "product";
  name: string;
  category: PriceCategory;
  durationMinutes: number | null;
  price: number | null;
  visibleInBooking: boolean | null;
  treatment?: ServiceType;
  product?: Product;
}

export function PricingCatalog() {
  const t = useTranslations("Billing.pricing");
  const tSt = useTranslations("Settings.scheduling.serviceTypes");
  const { accountId, defaultCurrency } = useAuth();
  const canEdit = useCan("edit-settings");
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [treatments, setTreatments] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [avgTicket, setAvgTicket] = useState<number | null>(null);
  const [insight, setInsight] = useState<{ name: string; months: number; rank: number } | null>(null);

  const [newTreatmentOpen, setNewTreatmentOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<PriceCategory>("other");
  const [newDuration, setNewDuration] = useState("30");
  const [newPrice, setNewPrice] = useState("");
  const [savingTreatment, setSavingTreatment] = useState(false);

  const [newProductOpen, setNewProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState<PriceCategory>("other");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  const fetchCatalog = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const [treatmentsRes, productsRes] = await Promise.all([
        supabase.from("service_types").select("*, product:products(*)").eq("account_id", accountId).order("name", { ascending: true }),
        supabase.from("products").select("*").eq("account_id", accountId).order("name", { ascending: true }),
      ]);
      if (treatmentsRes.error) throw treatmentsRes.error;
      if (productsRes.error) throw productsRes.error;
      setTreatments((treatmentsRes.data ?? []) as ServiceType[]);
      setProducts((productsRes.data ?? []) as Product[]);
    } catch (err) {
      console.error("Failed to fetch price catalog:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [accountId, supabase, t]);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

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

  // A standalone product is one no treatment links to — a plain
  // billable item (retail, take-home kit) rather than a scheduled
  // service. Everything else about it renders exactly like a
  // treatment row, minus duration/booking (neither applies).
  const standaloneProducts = useMemo(() => {
    const linkedIds = new Set(treatments.map((tr) => tr.product_id).filter((id): id is string => !!id));
    return products.filter((p) => !linkedIds.has(p.id));
  }, [treatments, products]);

  const rows = useMemo<PriceRow[]>(() => {
    const treatmentRows: PriceRow[] = treatments.map((tr) => ({
      id: tr.id,
      kind: "treatment",
      name: tr.name,
      category: tr.category,
      durationMinutes: tr.duration_minutes,
      price: tr.price ?? null,
      visibleInBooking: tr.visible_in_booking,
      treatment: tr,
    }));
    const productRows: PriceRow[] = standaloneProducts.map((p) => ({
      id: p.id,
      kind: "product",
      name: p.name,
      category: p.category,
      durationMinutes: null,
      price: p.unit_price,
      visibleInBooking: null,
      product: p,
    }));
    return [...treatmentRows, ...productRows].sort((a, b) => a.name.localeCompare(b.name));
  }, [treatments, standaloneProducts]);

  // "Zen detectó" — a real computed nudge, not a fabricated one: among
  // every billable item actually sold the most (by revenue, via
  // invoice line items — treatments through their linked product,
  // plain products directly), find the one whose price hasn't moved
  // in the longest time. Hidden entirely if nothing qualifies rather
  // than showing a made-up insight.
  useEffect(() => {
    if (!accountId || rows.length === 0) return;
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
      const ranked = rows
        .map((row) => {
          const productId = row.kind === "treatment" ? row.treatment?.product_id : row.product?.id;
          const revenue = productId ? (revenueByProduct.get(productId) ?? 0) : 0;
          const updatedAt = row.kind === "treatment" ? (row.treatment?.product?.updated_at ?? row.treatment?.updated_at) : row.product?.updated_at;
          return { row, revenue, updatedAt };
        })
        .filter((entry) => entry.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, TOP_N_FOR_INSIGHT);

      let stalest: { name: string; months: number; rank: number } | null = null;
      ranked.forEach((entry, i) => {
        if (!entry.updatedAt) return;
        const days = (Date.now() - new Date(entry.updatedAt).getTime()) / DAY_MS;
        if (days < STALE_PRICE_DAYS) return;
        const months = Math.floor(days / 30);
        if (!stalest || months > stalest.months) {
          stalest = { name: entry.row.name, months, rank: i + 1 };
        }
      });
      setInsight(stalest);
    })();
  }, [accountId, rows, supabase]);

  const activeCount = useMemo(() => treatments.filter((tr) => tr.is_active).length, [treatments]);
  const visibleCount = useMemo(() => treatments.filter((tr) => tr.is_active && tr.visible_in_booking).length, [treatments]);

  async function syncTreatmentPrice(treatment: ServiceType, price: number | null) {
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
      setProducts((prev) => prev.map((p) => (p.id === treatment.product_id ? { ...p, unit_price: price } : p)));
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
      setProducts((prev) => [...prev, product]);
    }
  }

  async function updateProductPrice(product: Product, price: number | null) {
    const { error } = await supabase
      .from("products")
      .update({ unit_price: price ?? 0 })
      .eq("id", product.id);
    if (error) {
      console.error("Update product price error:", error);
      toast.error(t("updateFailed"));
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, unit_price: price ?? 0 } : p)));
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

  async function updateRowCategory(row: PriceRow, category: PriceCategory) {
    const table = row.kind === "treatment" ? "service_types" : "products";
    const { error } = await supabase.from(table).update({ category }).eq("id", row.id);
    if (error) {
      console.error("Update category error:", error);
      toast.error(t("updateFailed"));
      return;
    }
    if (row.kind === "treatment") {
      setTreatments((prev) => prev.map((tr) => (tr.id === row.id ? { ...tr, category } : tr)));
    } else {
      setProducts((prev) => prev.map((p) => (p.id === row.id ? { ...p, category } : p)));
    }
  }

  async function handleCreateTreatment() {
    if (!newName.trim() || !accountId) {
      toast.error(tSt("namePlaceholder"));
      return;
    }
    setSavingTreatment(true);
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
          .insert({ account_id: accountId, name: newName.trim(), unit_price: price, category: newCategory })
          .select("id")
          .single();
        if (product) {
          await supabase.from("service_types").update({ product_id: product.id }).eq("id", created.id);
        }
      }
      toast.success(t("created"));
      setNewTreatmentOpen(false);
      setNewName("");
      setNewCategory("other");
      setNewDuration("30");
      setNewPrice("");
      await fetchCatalog();
    } catch (err) {
      console.error("Create treatment error:", err);
      toast.error(t("createFailed"));
    } finally {
      setSavingTreatment(false);
    }
  }

  async function handleCreateProduct() {
    if (!newProductName.trim() || !accountId) {
      toast.error(tSt("namePlaceholder"));
      return;
    }
    setSavingProduct(true);
    try {
      const { error } = await supabase.from("products").insert({
        account_id: accountId,
        name: newProductName.trim(),
        category: newProductCategory,
        unit_price: newProductPrice.trim() ? Number(newProductPrice) : 0,
      });
      if (error) throw error;
      toast.success(t("productCreated"));
      setNewProductOpen(false);
      setNewProductName("");
      setNewProductCategory("other");
      setNewProductPrice("");
      await fetchCatalog();
    } catch (err) {
      console.error("Create product error:", err);
      toast.error(t("productCreateFailed"));
    } finally {
      setSavingProduct(false);
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
        {rows.length === 0 ? (
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
            {rows.map((row) => (
              <div
                key={`${row.kind}-${row.id}`}
                className="grid min-w-[720px] grid-cols-[1.9fr_1.3fr_0.9fr_1fr_100px] items-center gap-3 border-t border-border px-4 py-3"
              >
                <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                <select
                  value={row.category}
                  onChange={(e) => updateRowCategory(row, e.target.value as PriceCategory)}
                  disabled={!canEdit}
                  className={`h-7 w-fit rounded-full border-0 px-2.5 text-[11px] font-bold outline-none disabled:opacity-70 ${CATEGORY_STYLES[row.category]}`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`categories.${c}`)}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">
                  {row.durationMinutes != null ? durationFormatter(row.durationMinutes) : "—"}
                </span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={row.price ?? ""}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const value = raw ? Number(raw) : null;
                    if (value === (row.price ?? null)) return;
                    if (value !== null && (!Number.isFinite(value) || value < 0)) return;
                    if (row.kind === "treatment" && row.treatment) void syncTreatmentPrice(row.treatment, value);
                    if (row.kind === "product" && row.product) void updateProductPrice(row.product, value);
                  }}
                  disabled={!canEdit}
                  placeholder={tSt("noPrice")}
                  className="h-8 text-right text-sm font-bold"
                />
                <div className="flex justify-center">
                  {row.kind === "treatment" && row.treatment ? (
                    <Switch
                      checked={row.visibleInBooking ?? false}
                      onCheckedChange={() => toggleBookingVisible(row.treatment!)}
                      disabled={!canEdit}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
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
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={() => setNewTreatmentOpen(true)} className="border-dashed">
              <Plus className="size-4" />
              {t("newTreatment")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setNewProductOpen(true)} className="border-dashed">
              <Plus className="size-4" />
              {t("newProduct")}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={newTreatmentOpen} onOpenChange={setNewTreatmentOpen}>
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
                onChange={(e) => setNewCategory(e.target.value as PriceCategory)}
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
            <Button variant="outline" size="sm" onClick={() => setNewTreatmentOpen(false)} disabled={savingTreatment}>
              {tSt("cancel")}
            </Button>
            <Button size="sm" onClick={handleCreateTreatment} disabled={savingTreatment}>
              {savingTreatment ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newProductOpen} onOpenChange={setNewProductOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("newProduct")}</DialogTitle>
            <p className="text-xs text-muted-foreground">{t("newProductHint")}</p>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tSt("namePlaceholder")}</Label>
              <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("columns.category")}</Label>
                <select
                  value={newProductCategory}
                  onChange={(e) => setNewProductCategory(e.target.value as PriceCategory)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`categories.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tSt("priceLabel")}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  placeholder={tSt("pricePlaceholder")}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewProductOpen(false)} disabled={savingProduct}>
              {tSt("cancel")}
            </Button>
            <Button size="sm" onClick={handleCreateProduct} disabled={savingProduct}>
              {savingProduct ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
