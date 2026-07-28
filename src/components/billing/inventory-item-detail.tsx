"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { InventoryItem, InventoryMovement, InventoryMovementDirection, InventoryMovementReason } from "@/types";

interface InventoryItemDetailProps {
  item: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

const DIRECTIONS: InventoryMovementDirection[] = ["in", "out"];
const REASONS: InventoryMovementReason[] = ["purchase", "consumption", "waste", "adjustment", "other"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function InventoryItemDetail({ item, open, onOpenChange, onChanged }: InventoryItemDetailProps) {
  const t = useTranslations("Billing.inventory");
  const { canManageMembers } = useAuth();

  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [direction, setDirection] = useState<InventoryMovementDirection>("out");
  const [reason, setReason] = useState<InventoryMovementReason>("consumption");
  const [quantity, setQuantity] = useState("");
  const [movementDate, setMovementDate] = useState(todayIso());
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/inventory/${item.id}/movements`);
      const data = await res.json();
      setMovements((data.movements ?? []) as InventoryMovement[]);
    } catch (err) {
      console.error("Load inventory movements error:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [item.id, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  function openForm() {
    setDirection("out");
    setReason("consumption");
    setQuantity("");
    setMovementDate(todayIso());
    setNotes("");
    setFormOpen(true);
  }

  async function handleCreate() {
    if (!quantity || Number(quantity) <= 0) {
      toast.error(t("requiredFields"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/billing/inventory/${item.id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          reason,
          quantity: Number(quantity),
          movement_date: movementDate,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      toast.success(t("movementCreated"));
      setFormOpen(false);
      await load();
      onChanged();
    } catch (err) {
      console.error("Create inventory movement error:", err);
      toast.error(err instanceof Error ? err.message : t("movementCreateFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/billing/inventory/${item.id}/movements/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      await load();
      onChanged();
    } catch (err) {
      console.error("Delete inventory movement error:", err);
      toast.error(t("movementDeleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
  const stock = item.computed_stock ?? item.initial_stock;
  const lowStock = stock <= item.minimum_stock;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className={`rounded-lg border p-4 ${lowStock ? "border-red-500/30 bg-red-500/5" : "border-border bg-muted/30"}`}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("currentStock")}</p>
            <p className={`mt-1 text-2xl font-bold ${lowStock ? "text-red-500" : "text-foreground"}`}>
              {stock} {item.unit}
            </p>
            {lowStock && <p className="mt-1 text-xs text-red-500">{t("lowStockWarning", { minimum: item.minimum_stock })}</p>}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{t("movements.title")}</p>
            <Button type="button" size="sm" onClick={openForm}>
              <Plus className="mr-1 size-3.5" />
              {t("newMovement")}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : movements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("movements.empty")}</p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-foreground">{t(`reasons.${m.reason}`)}{m.notes ? ` — ${m.notes}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(m.movement_date))}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={m.direction === "in" ? "text-emerald-500" : "text-red-500"}>
                      {m.direction === "in" ? "+" : "−"}
                      {m.quantity} {item.unit}
                    </span>
                    {canManageMembers && (
                      <Button type="button" variant="ghost" size="sm" disabled={deletingId === m.id} onClick={() => handleDelete(m.id)}>
                        {deletingId === m.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3 text-muted-foreground" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("newMovement")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.direction")}</Label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as InventoryMovementDirection)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {DIRECTIONS.map((d) => (
                    <option key={d} value={d}>
                      {t(`directions.${d}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.reason")}</Label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as InventoryMovementReason)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`reasons.${r}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.quantity")}</Label>
                <Input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.date")}</Label>
                <Input type="date" value={movementDate} onChange={(e) => setMovementDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("form.notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm" />
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
    </Dialog>
  );
}
