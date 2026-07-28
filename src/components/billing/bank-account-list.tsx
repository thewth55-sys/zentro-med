"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Landmark, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BankAccountDetail } from "./bank-account-detail";
import type { BankAccount } from "@/types";

/**
 * Bancos tab — phase 2 of the finance module (migration 079). Each
 * account shows its computed balance (opening_balance + attributed
 * payments/expenses/transactions, summed server-side); clicking one
 * opens BankAccountDetail's combined ledger.
 */
export function BankAccountList() {
  const t = useTranslations("Billing.bankAccounts");
  const { defaultCurrency, canManageMembers } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<BankAccount | null>(null);

  const [name, setName] = useState("");
  const [bankName, setBankName] = useState("");
  const [last4, setLast4] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/bank-accounts");
      const data = await res.json();
      setAccounts((data.bankAccounts ?? []) as BankAccount[]);
    } catch (err) {
      console.error("Failed to fetch bank accounts:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  function openCreate() {
    setName("");
    setBankName("");
    setLast4("");
    setOpeningBalance("0");
    setFormOpen(true);
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/billing/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bank_name: bankName.trim() || undefined,
          account_number_last4: last4.trim() || undefined,
          opening_balance: Number(openingBalance) || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      toast.success(t("created"));
      setFormOpen(false);
      await fetchAccounts();
    } catch (err) {
      console.error("Create bank account error:", err);
      toast.error(err instanceof Error ? err.message : t("createFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/billing/bank-accounts/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      toast.success(t("deleted"));
    } catch (err) {
      console.error("Delete bank account error:", err);
      toast.error(err instanceof Error ? err.message : t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <Button type="button" size="sm" onClick={openCreate} className="bg-primary text-xs text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1 size-3.5" />
          {t("newAccount")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Landmark className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="group relative rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
            >
              <button type="button" onClick={() => setSelected(account)} className="block w-full text-left">
                <div className="flex items-center gap-2">
                  <Landmark className="size-4 text-muted-foreground" />
                  <p className="font-medium text-foreground">{account.name}</p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {account.bank_name}
                  {account.account_number_last4 ? ` · •••• ${account.account_number_last4}` : ""}
                </p>
                <p className="mt-3 text-xl font-bold tabular-nums text-foreground">
                  {formatCurrency(account.computed_balance ?? account.opening_balance, account.currency || defaultCurrency)}
                </p>
              </button>
              {canManageMembers && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                  disabled={deletingId === account.id}
                  onClick={() => handleDelete(account.id)}
                >
                  {deletingId === account.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("newAccount")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("form.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("form.namePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("form.bankName")}</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.last4")}</Label>
                <Input value={last4} onChange={(e) => setLast4(e.target.value)} maxLength={4} placeholder="1234" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.openingBalance")}</Label>
                <Input type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
              </div>
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
        <BankAccountDetail
          account={selected}
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          onChanged={fetchAccounts}
        />
      )}
    </div>
  );
}
