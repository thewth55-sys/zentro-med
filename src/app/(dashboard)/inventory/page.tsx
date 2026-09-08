"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Boxes, Download, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InventoryItemDetail } from "@/components/billing/inventory-item-detail";
import type { InventoryCategory, InventoryItem } from "@/types";

const CATEGORIES: InventoryCategory[] = ["supplies", "materials", "instruments", "equipment", "other"];
const EXPIRING_WINDOW_DAYS = 60;
const DAY_MS = 86_400_000;

type ViewMode = "all" | "low" | "expiring" | "suppliers";
type ItemStatus = "order_now" | "low" | "expiring" | "ok";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function itemStatus(item: InventoryItem): ItemStatus {
  const stock = item.computed_stock ?? item.initial_stock;
  if (item.minimum_stock > 0 && stock <= item.minimum_stock * 0.5) return "order_now";
  if (stock <= item.minimum_stock) return "low";
  if (item.expiry_date && new Date(item.expiry_date).getTime() - Date.now() <= EXPIRING_WINDOW_DAYS * DAY_MS) return "expiring";
  return "ok";
}

const STATUS_STYLES: Record<ItemStatus, string> = {
  order_now: "bg-red-500/10 text-red-600 dark:text-red-400",
  low: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  expiring: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  ok: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export default function InventoryPage() {
  const t = useTranslations("Billing.inventory");
  const { defaultCurrency } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [consumptionThisMonth, setConsumptionThisMonth] = useState(0);
  const [view, setView] = useState<ViewMode>("all");
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<InventoryItem | null>(null);

  // New item
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("supplies");
  const [unit, setUnit] = useState("unidad");
  const [unitCost, setUnitCost] = useState("");
  const [initialStock, setInitialStock] = useState("0");
  const [minimumStock, setMinimumStock] = useState("0");
  const [supplier, setSupplier] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // Quick "register entry"
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryItemId, setEntryItemId] = useState("");
  const [entryQuantity, setEntryQuantity] = useState("");
  const [entryUnitCost, setEntryUnitCost] = useState("");
  const [entryDate, setEntryDate] = useState(todayIso());
  const [savingEntry, setSavingEntry] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/inventory");
      const data = await res.json();
      setItems((data.items ?? []) as InventoryItem[]);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  // Consumption needs each item's unit_cost as the fallback for
  // movements with no unit_cost_at_time snapshot (see 080's design
  // notes on why that column is optional) — so it waits for items.
  useEffect(() => {
    if (items.length === 0) return;
    (async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("quantity, unit_cost_at_time, item_id")
        .eq("direction", "out")
        .eq("reason", "consumption")
        .gte("movement_date", from)
        .lte("movement_date", to);
      if (error) {
        console.error("Failed to fetch consumption:", error);
        return;
      }
      const costByItem = new Map(items.map((i) => [i.id, i.unit_cost ?? 0]));
      const total = ((data ?? []) as { quantity: number; unit_cost_at_time: number | null; item_id: string }[]).reduce(
        (sum, m) => sum + Number(m.quantity) * (m.unit_cost_at_time ?? costByItem.get(m.item_id) ?? 0),
        0,
      );
      setConsumptionThisMonth(total);
    })();
  }, [items, supabase]);

  const inventoryValue = useMemo(
    () => items.reduce((sum, i) => sum + (i.computed_stock ?? i.initial_stock) * (i.unit_cost ?? 0), 0),
    [items],
  );
  const lowStockItems = useMemo(() => items.filter((i) => itemStatus(i) === "order_now" || itemStatus(i) === "low"), [items]);
  const expiringItems = useMemo(
    () =>
      items.filter(
        (i) => i.expiry_date && new Date(i.expiry_date).getTime() - Date.now() <= EXPIRING_WINDOW_DAYS * DAY_MS,
      ),
    [items],
  );

  const suppliers = useMemo(() => {
    const map = new Map<string, { name: string; count: number; value: number }>();
    for (const item of items) {
      const key = item.supplier?.trim() || t("noSupplier");
      const entry = map.get(key) ?? { name: key, count: 0, value: 0 };
      entry.count += 1;
      entry.value += (item.computed_stock ?? item.initial_stock) * (item.unit_cost ?? 0);
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [items, t]);

  const visibleItems = useMemo(() => {
    let list = items;
    if (view === "low") list = lowStockItems;
    else if (view === "expiring") list = expiringItems;
    if (supplierFilter) list = list.filter((i) => (i.supplier?.trim() || t("noSupplier")) === supplierFilter);
    return list;
  }, [items, view, lowStockItems, expiringItems, supplierFilter, t]);

  function selectView(v: ViewMode) {
    setView(v);
    if (v !== "suppliers") setSupplierFilter(null);
  }

  function openNewItem() {
    setName("");
    setCategory("supplies");
    setUnit("unidad");
    setUnitCost("");
    setInitialStock("0");
    setMinimumStock("0");
    setSupplier("");
    setExpiryDate("");
    setNewItemOpen(true);
  }

  async function handleCreateItem() {
    if (!name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    setSavingItem(true);
    try {
      const res = await fetch("/api/billing/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          unit: unit.trim() || "unidad",
          unit_cost: unitCost ? Number(unitCost) : undefined,
          initial_stock: Number(initialStock) || 0,
          minimum_stock: Number(minimumStock) || 0,
          supplier: supplier.trim() || undefined,
          expiry_date: expiryDate || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      toast.success(t("created"));
      setNewItemOpen(false);
      await fetchItems();
    } catch (err) {
      console.error("Create inventory item error:", err);
      toast.error(err instanceof Error ? err.message : t("createFailed"));
    } finally {
      setSavingItem(false);
    }
  }

  function openEntry() {
    setEntryItemId(items[0]?.id ?? "");
    setEntryQuantity("");
    setEntryUnitCost("");
    setEntryDate(todayIso());
    setEntryOpen(true);
  }

  useEffect(() => {
    if (!entryItemId) return;
    const item = items.find((i) => i.id === entryItemId);
    setEntryUnitCost(item?.unit_cost != null ? String(item.unit_cost) : "");
  }, [entryItemId, items]);

  async function handleSaveEntry() {
    if (!entryItemId) {
      toast.error(t("entryItemRequired"));
      return;
    }
    if (!entryQuantity || Number(entryQuantity) <= 0) {
      toast.error(t("requiredFields"));
      return;
    }
    setSavingEntry(true);
    try {
      const res = await fetch(`/api/billing/inventory/${entryItemId}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: "in",
          reason: "purchase",
          quantity: Number(entryQuantity),
          unit_cost_at_time: entryUnitCost ? Number(entryUnitCost) : undefined,
          movement_date: entryDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      toast.success(t("movementCreated"));
      setEntryOpen(false);
      await fetchItems();
    } catch (err) {
      console.error("Register entry error:", err);
      toast.error(err instanceof Error ? err.message : t("movementCreateFailed"));
    } finally {
      setSavingEntry(false);
    }
  }

  function handlePurchaseOrder() {
    if (lowStockItems.length === 0) {
      toast.info(t("purchaseOrder.none"));
      return;
    }
    const header = [t("purchaseOrder.columns.item"), t("purchaseOrder.columns.supplier"), t("purchaseOrder.columns.stock"), t("purchaseOrder.columns.minimum"), t("purchaseOrder.columns.toOrder"), t("purchaseOrder.columns.unitCost"), t("purchaseOrder.columns.subtotal")];
    const rows = [...lowStockItems]
      .sort((a, b) => (a.supplier || "").localeCompare(b.supplier || ""))
      .map((i) => {
        const stock = i.computed_stock ?? i.initial_stock;
        const toOrder = Math.max(0, i.minimum_stock - stock);
        return [
          i.name,
          i.supplier || t("noSupplier"),
          `${stock} ${i.unit}`,
          `${i.minimum_stock} ${i.unit}`,
          `${toOrder} ${i.unit}`,
          String(i.unit_cost ?? 0),
          String(toOrder * (i.unit_cost ?? 0)),
        ];
      });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orden-de-compra-${todayIso()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Boxes}
        title={t("pageTitle")}
        description={t("subtitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handlePurchaseOrder}>
              <Download className="size-4" />
              {t("purchaseOrder.generate")}
            </Button>
            <Button type="button" onClick={openEntry} disabled={items.length === 0}>
              <Plus className="size-4" />
              {t("registerEntry")}
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => selectView("all")}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${view === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t("tabs.all", { count: items.length })}
              </button>
              <button
                type="button"
                onClick={() => selectView("low")}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${view === "low" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t("tabs.low", { count: lowStockItems.length })}
              </button>
              <button
                type="button"
                onClick={() => selectView("expiring")}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${view === "expiring" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t("tabs.expiring", { count: expiringItems.length })}
              </button>
              <button
                type="button"
                onClick={() => selectView("suppliers")}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${view === "suppliers" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t("tabs.suppliers")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{t("cards.value")}</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{formatCurrency(inventoryValue, defaultCurrency)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{t("cards.consumption")}</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{formatCurrency(consumptionThisMonth, defaultCurrency)}</p>
              </CardContent>
            </Card>
            <Card className={lowStockItems.length > 0 ? "border-red-500/30 bg-red-500/5" : undefined}>
              <CardContent className="p-4">
                <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{t("cards.lowStock")}</p>
                <p className={`mt-1.5 text-2xl font-bold tabular-nums ${lowStockItems.length > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                  {lowStockItems.length}
                </p>
              </CardContent>
            </Card>
            <Card className={expiringItems.length > 0 ? "border-amber-500/30 bg-amber-500/5" : undefined}>
              <CardContent className="p-4">
                <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{t("cards.expiring", { days: EXPIRING_WINDOW_DAYS })}</p>
                <p className={`mt-1.5 text-2xl font-bold tabular-nums ${expiringItems.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                  {expiringItems.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {view === "suppliers" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suppliers.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => {
                    setSupplierFilter(s.name);
                    setView("all");
                  }}
                  className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
                >
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{formatCurrency(s.value, defaultCurrency)}</p>
                  <p className="text-xs text-muted-foreground">{t("supplierItemCount", { count: s.count })}</p>
                </button>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Boxes className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
              <Button type="button" size="sm" onClick={openNewItem} className="mt-2">
                <Plus className="mr-1 size-3.5" />
                {t("newItem")}
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-3">
                {supplierFilter && (
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {t("filteredBySupplier", { supplier: supplierFilter })}
                    <button type="button" onClick={() => setSupplierFilter(null)} className="font-medium text-primary hover:underline">
                      {t("clearFilter")}
                    </button>
                  </span>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={openNewItem} className="ml-auto text-xs">
                  <Plus className="size-3.5" />
                  {t("newItem")}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <div className="grid min-w-[720px] grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 bg-muted/40 px-4 py-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">
                  <span>{t("columns.name")}</span>
                  <span>{t("columns.category")}</span>
                  <span>{t("columns.stock")}</span>
                  <span>{t("columns.minimumShort")}</span>
                  <span>{t("columns.unitCost")}</span>
                  <span className="text-center">{t("columns.status")}</span>
                </div>
                {visibleItems.map((item) => {
                  const stock = item.computed_stock ?? item.initial_stock;
                  const status = itemStatus(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className="grid min-w-[720px] cursor-pointer grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center gap-3 border-t border-border px-4 py-3 hover:bg-muted/40"
                    >
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.supplier || t("noSupplier")}</p>
                      </div>
                      <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{t(`categories.${item.category}`)}</span>
                      <span className={`text-sm font-bold tabular-nums ${status === "order_now" || status === "low" ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                        {stock} {item.unit}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {item.minimum_stock} {item.unit}
                      </span>
                      <span className="text-sm tabular-nums text-foreground">{item.unit_cost != null ? formatCurrency(item.unit_cost, defaultCurrency) : "—"}</span>
                      <span className={`w-fit justify-self-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${STATUS_STYLES[status]}`}>
                        {status === "order_now" && t("status.orderNow")}
                        {status === "low" && t("status.low")}
                        {status === "expiring" && t("status.expiring", { month: monthFormatter.format(new Date(item.expiry_date!)) })}
                        {status === "ok" && t("status.ok")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("newItem")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.category")}</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`categories.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.unit")}</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t("form.unitPlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.unitCost")}</Label>
                <Input type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.initialStock")}</Label>
                <Input type="number" step="0.01" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.minimumStock")}</Label>
                <Input type="number" step="0.01" value={minimumStock} onChange={(e) => setMinimumStock(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.supplier")}</Label>
                <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.expiryDate")}</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewItemOpen(false)} disabled={savingItem}>
              {t("form.cancel")}
            </Button>
            <Button size="sm" onClick={handleCreateItem} disabled={savingItem}>
              {savingItem ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("form.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("registerEntry")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("columns.name")}</Label>
              <select
                value={entryItemId}
                onChange={(e) => setEntryItemId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.quantity")}</Label>
                <Input type="number" min="0.01" step="0.01" value={entryQuantity} onChange={(e) => setEntryQuantity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.unitCost")}</Label>
                <Input type="number" step="0.01" value={entryUnitCost} onChange={(e) => setEntryUnitCost(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("form.date")}</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEntryOpen(false)} disabled={savingEntry}>
              {t("form.cancel")}
            </Button>
            <Button size="sm" onClick={handleSaveEntry} disabled={savingEntry}>
              {savingEntry ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("form.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selected && (
        <InventoryItemDetail item={selected} open={!!selected} onOpenChange={(open) => !open && setSelected(null)} onChanged={fetchItems} />
      )}
    </div>
  );
}
