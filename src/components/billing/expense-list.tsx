"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BankAccount, Expense, ExpenseCategory, PaymentMethod } from "@/types";

const CATEGORIES: ExpenseCategory[] = [
  "rent", "payroll", "supplies", "utilities", "marketing", "equipment", "taxes", "software", "other",
];
const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "transfer", "other"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Gastos tab — phase 1 of the finance module (migration 078). Same
 * shape as InvoiceList (table + create dialog), simpler since an
 * expense has no line items or numbering — it's a single record.
 */
export function ExpenseList() {
  const t = useTranslations("Billing.expenseList");
  const { defaultCurrency, canManageMembers } = useAuth();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [vendor, setVendor] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("other");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/billing/bank-accounts")
      .then((res) => res.json())
      .then((data) => setBankAccounts((data.bankAccounts ?? []) as BankAccount[]))
      .catch((err) => console.error("Failed to fetch bank accounts:", err));
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/expenses");
      const data = await res.json();
      setExpenses((data.expenses ?? []) as Expense[]);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchExpenses();
  }, [fetchExpenses]);

  function openCreate() {
    setCategory("other");
    setDescription("");
    setAmount("");
    setExpenseDate(todayIso());
    setVendor("");
    setPaymentMethod("other");
    setBankAccountId("");
    setNotes("");
    setFormOpen(true);
  }

  async function handleCreate() {
    if (!description.trim() || !amount || Number(amount) <= 0) {
      toast.error(t("requiredFields"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/billing/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: description.trim(),
          amount: Number(amount),
          expense_date: expenseDate,
          vendor: vendor.trim() || undefined,
          payment_method: paymentMethod,
          bank_account_id: bankAccountId || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      toast.success(t("created"));
      setFormOpen(false);
      await fetchExpenses();
    } catch (err) {
      console.error("Create expense error:", err);
      toast.error(err instanceof Error ? err.message : t("createFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/billing/expenses/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success(t("deleted"));
    } catch (err) {
      console.error("Delete expense error:", err);
      toast.error(err instanceof Error ? err.message : t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <Button type="button" size="sm" onClick={openCreate} className="bg-primary text-xs text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1 size-3.5" />
          {t("newExpense")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Wallet className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.date")}</TableHead>
              <TableHead>{t("columns.category")}</TableHead>
              <TableHead>{t("columns.description")}</TableHead>
              <TableHead>{t("columns.vendor")}</TableHead>
              <TableHead>{t("columns.amount")}</TableHead>
              {canManageMembers && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{dateFormatter.format(new Date(expense.expense_date))}</TableCell>
                <TableCell>{t(`categories.${expense.category}`)}</TableCell>
                <TableCell className="font-medium text-foreground">{expense.description}</TableCell>
                <TableCell>{expense.vendor || "—"}</TableCell>
                <TableCell>{formatCurrency(expense.amount, expense.currency || defaultCurrency)}</TableCell>
                {canManageMembers && (
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === expense.id}
                      onClick={() => handleDelete(expense.id)}
                    >
                      {deletingId === expense.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("newExpense")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.category")}</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
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
                <Label className="text-xs text-muted-foreground">{t("form.date")}</Label>
                <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("form.description")}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("form.descriptionPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.amount")}</Label>
                <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.paymentMethod")}</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {t(`paymentMethods.${m}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("form.vendor")}</Label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder={t("form.vendorPlaceholder")} />
            </div>
            {bankAccounts.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("form.bankAccount")}</Label>
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">{t("form.noBankAccount")}</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
    </div>
  );
}
