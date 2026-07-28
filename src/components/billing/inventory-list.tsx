"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Boxes, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InventoryItemDetail } from "./inventory-item-detail";
import type { InventoryCategory, InventoryItem } from "@/types";

const CATEGORIES: InventoryCategory[] = ["supplies", "materials", "instruments", "equipment", "other"];

/**
 * Inventario tab — phase 3 of the finance module (migration 080).
 * Same shape as BankAccountList (computed running total server-side,
 * click a row to open a detail dialog with the movement ledger).
 */
export function InventoryList() {
  const t = useTranslations("Billing.inventory");
  const { defaultCurrency, canManageMembers } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<InventoryItem | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("supplies");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("unidad");
  const [unitCost, setUnitCost] = useState("");
  const [initialStock, setInitialStock] = useState("0");
  const [minimumStock, setMinimumStock] = useState("0");
  const [supplier, setSupplier] = useState("");

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

  function openCreate() {
    setName("");
    setCategory("supplies");
    setSku("");
    setUnit("unidad");
    setUnitCost("");
    setInitialStock("0");
    setMinimumStock("0");
    setSupplier("");
    setFormOpen(true);
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/billing/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          sku: sku.trim() || undefined,
          unit: unit.trim() || "unidad",
          unit_cost: unitCost ? Number(unitCost) : undefined,
          initial_stock: Number(initialStock) || 0,
          minimum_stock: Number(minimumStock) || 0,
          supplier: supplier.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      toast.success(t("created"));
      setFormOpen(false);
      await fetchItems();
    } catch (err) {
      console.error("Create inventory item error:", err);
      toast.error(err instanceof Error ? err.message : t("createFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/billing/inventory/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success(t("deleted"));
    } catch (err) {
      console.error("Delete inventory item error:", err);
      toast.error(err instanceof Error ? err.message : t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  const lowStockCount = items.filter((i) => (i.computed_stock ?? i.initial_stock) <= i.minimum_stock).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          {lowStockCount > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
              <AlertTriangle className="size-3.5" />
              {t("lowStockCount", { count: lowStockCount })}
            </p>
          )}
        </div>
        <Button type="button" size="sm" onClick={openCreate} className="bg-primary text-xs text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1 size-3.5" />
          {t("newItem")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Boxes className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.category")}</TableHead>
              <TableHead>{t("columns.stock")}</TableHead>
              <TableHead>{t("columns.unitCost")}</TableHead>
              <TableHead>{t("columns.supplier")}</TableHead>
              {canManageMembers && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const stock = item.computed_stock ?? item.initial_stock;
              const lowStock = stock <= item.minimum_stock;
              return (
                <TableRow key={item.id} onClick={() => setSelected(item)} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell>{t(`categories.${item.category}`)}</TableCell>
                  <TableCell className={lowStock ? "font-medium text-red-500" : ""}>
                    {stock} {item.unit}
                    {lowStock && <AlertTriangle className="ml-1 inline size-3.5" />}
                  </TableCell>
                  <TableCell>{item.unit_cost != null ? formatCurrency(item.unit_cost, defaultCurrency) : "—"}</TableCell>
                  <TableCell>{item.supplier || "—"}</TableCell>
                  {canManageMembers && (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                      >
                        {deletingId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5 text-muted-foreground" />}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
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
                <Label className="text-xs text-muted-foreground">{t("form.sku")}</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.unit")}</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t("form.unitPlaceholder")} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.unitCost")}</Label>
                <Input type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.initialStock")}</Label>
                <Input type="number" step="0.01" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.minimumStock")}</Label>
                <Input type="number" step="0.01" value={minimumStock} onChange={(e) => setMinimumStock(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("form.supplier")}</Label>
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)} disabled={saving}>
              {t("form.cancel")}
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("form.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selected && (
        <InventoryItemDetail
          item={selected}
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          onChanged={fetchItems}
        />
      )}
    </div>
  );
}
