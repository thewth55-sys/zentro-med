"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BankAccount, BankTransactionCategory, BankTransactionDirection } from "@/types";

interface BankAccountDetailProps {
  account: BankAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

interface LedgerRow {
  id: string;
  date: string;
  kind: "payment" | "expense" | "transaction";
  label: string;
  amount: number;
  /** Signed for display — positive (green) is money in, negative (red) is money out. */
  signedAmount: number;
  deletable: boolean;
  /** Only set for kind === "transaction" — needed to prefill the edit form. */
  direction?: BankTransactionDirection;
  category?: BankTransactionCategory;
}

const DIRECTIONS: BankTransactionDirection[] = ["in", "out"];
const CATEGORIES: BankTransactionCategory[] = [
  "transfer", "owner_draw", "capital_contribution", "bank_fee", "interest", "other",
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Combined chronological ledger for one bank account — payments
 * (money in, read via the browser Supabase client since there's no
 * top-level payments-listing API route yet), expenses (money out),
 * and manual bank_transactions, merged and sorted client-side. No
 * existing "combine N record types into one timeline" component to
 * reuse — this is the first one.
 */
export function BankAccountDetail({ account, open, onOpenChange, onChanged }: BankAccountDetailProps) {
  const t = useTranslations("Billing.bankAccounts");
  const { canManageMembers } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [direction, setDirection] = useState<BankTransactionDirection>("out");
  const [category, setCategory] = useState<BankTransactionCategory>("other");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(todayIso());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, expensesRes, transactionsRes] = await Promise.all([
        supabase
          .from("payments")
          .select("id, amount, paid_at, method, invoice:invoices(invoice_number)")
          .eq("bank_account_id", account.id),
        supabase.from("expenses").select("id, amount, expense_date, description").eq("bank_account_id", account.id),
        fetch(`/api/billing/bank-accounts/${account.id}/transactions`).then((res) => res.json()),
      ]);

      const paymentRows: LedgerRow[] = (paymentsRes.data ?? []).map((p) => {
        const invoice = Array.isArray(p.invoice) ? p.invoice[0] : p.invoice;
        return {
          id: p.id,
          date: p.paid_at,
          kind: "payment",
          label: invoice?.invoice_number ? t("ledger.paymentFor", { number: invoice.invoice_number }) : t("ledger.payment"),
          amount: p.amount,
          signedAmount: p.amount,
          deletable: false,
        };
      });

      const expenseRows: LedgerRow[] = (expensesRes.data ?? []).map((e) => ({
        id: e.id,
        date: e.expense_date,
        kind: "expense",
        label: e.description,
        amount: e.amount,
        signedAmount: -e.amount,
        deletable: false,
      }));

      const transactionRows: LedgerRow[] = (transactionsRes.transactions ?? []).map(
        (tx: {
          id: string;
          transaction_date: string;
          description: string;
          amount: number;
          direction: BankTransactionDirection;
          category: BankTransactionCategory;
        }) => ({
          id: tx.id,
          date: tx.transaction_date,
          kind: "transaction",
          label: tx.description,
          amount: tx.amount,
          signedAmount: tx.direction === "in" ? tx.amount : -tx.amount,
          deletable: true,
          direction: tx.direction,
          category: tx.category,
        }),
      );

      setRows(
        [...paymentRows, ...expenseRows, ...transactionRows].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      );
    } catch (err) {
      console.error("Load bank account ledger error:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [account.id, supabase, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  function openTxForm() {
    setEditingTxId(null);
    setDirection("out");
    setCategory("other");
    setDescription("");
    setAmount("");
    setTransactionDate(todayIso());
    setTxFormOpen(true);
  }

  function openEditTxForm(row: LedgerRow) {
    setEditingTxId(row.id);
    setDirection(row.direction ?? "out");
    setCategory(row.category ?? "other");
    setDescription(row.label);
    setAmount(String(row.amount));
    setTransactionDate(row.date.slice(0, 10));
    setTxFormOpen(true);
  }

  async function handleSaveTransaction() {
    if (!description.trim() || !amount || Number(amount) <= 0) {
      toast.error(t("requiredFields"));
      return;
    }
    setSaving(true);
    try {
      const url = editingTxId
        ? `/api/billing/bank-accounts/${account.id}/transactions/${editingTxId}`
        : `/api/billing/bank-accounts/${account.id}/transactions`;
      const res = await fetch(url, {
        method: editingTxId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          category,
          description: description.trim(),
          amount: Number(amount),
          transaction_date: transactionDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      toast.success(editingTxId ? t("transactionUpdated") : t("transactionCreated"));
      setTxFormOpen(false);
      setEditingTxId(null);
      await load();
      onChanged();
    } catch (err) {
      console.error("Save bank transaction error:", err);
      toast.error(
        err instanceof Error ? err.message : editingTxId ? t("transactionUpdateFailed") : t("transactionCreateFailed")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTransaction(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/billing/bank-accounts/${account.id}/transactions/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      await load();
      onChanged();
    } catch (err) {
      console.error("Delete bank transaction error:", err);
      toast.error(t("transactionDeleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{account.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("balance")}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {formatCurrency(account.computed_balance ?? account.opening_balance, account.currency)}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{t("ledger.title")}</p>
            <Button type="button" size="sm" onClick={openTxForm}>
              <Plus className="mr-1 size-3.5" />
              {t("newTransaction")}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("ledger.empty")}</p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {rows.map((row) => (
                <div
                  key={`${row.kind}-${row.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-foreground">{row.label}</p>
                    <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(row.date))}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={row.signedAmount >= 0 ? "text-emerald-500" : "text-red-500"}>
                      {row.signedAmount >= 0 ? "+" : "−"}
                      {formatCurrency(row.amount, account.currency)}
                    </span>
                    {row.deletable && canManageMembers && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditTxForm(row)}
                        >
                          <Pencil className="size-3 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === row.id}
                          onClick={() => handleDeleteTransaction(row.id)}
                        >
                          {deletingId === row.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3 text-muted-foreground" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      <Dialog open={txFormOpen} onOpenChange={setTxFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingTxId ? t("editTransaction") : t("newTransaction")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.direction")}</Label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as BankTransactionDirection)}
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
                <Label className="text-xs text-muted-foreground">{t("form.category")}</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BankTransactionCategory)}
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
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("form.description")}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.amount")}</Label>
                <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.date")}</Label>
                <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTxFormOpen(false)} disabled={saving}>
              {t("form.cancel")}
            </Button>
            <Button size="sm" onClick={handleSaveTransaction} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("form.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
