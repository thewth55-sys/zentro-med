"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Landmark,
  Link2,
  Loader2,
  Plus,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BankAccountDetail } from "@/components/billing/bank-account-detail";
import type { BankAccount, BankTransactionCategory, BankTransactionDirection } from "@/types";

interface CashRegisterData {
  id: string;
  opening_balance: number;
  status: "open" | "closed";
  opened_at: string;
  cashIn: number;
  cashExpenses: number;
  balance: number;
}

interface LedgerEntry {
  id: string;
  at: string;
  concept: string;
  ref: string;
  bucketId: string;
  bucketLabel: string;
  amount: number;
  runningBalance: number;
  currency: string;
  unreconciled?: boolean;
}

interface BankingData {
  currency: string;
  month: string;
  bankAccounts: BankAccount[];
  cashRegister: CashRegisterData | null;
  unreconciled: { count: number; total: number };
  ledger: LedgerEntry[];
}

interface UnreconciledRow {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  bank_account_id: string;
}

const DIRECTIONS: BankTransactionDirection[] = ["in", "out"];
const CATEGORIES: BankTransactionCategory[] = ["transfer", "owner_draw", "capital_contribution", "bank_fee", "interest", "other"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BankingPage() {
  const t = useTranslations("Billing.banking");
  const tAcc = useTranslations("Billing.bankAccounts");
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BankingData | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  // Add bank account
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [accName, setAccName] = useState("");
  const [accBankName, setAccBankName] = useState("");
  const [accLast4, setAccLast4] = useState("");
  const [accOpeningBalance, setAccOpeningBalance] = useState("0");
  const [savingAccount, setSavingAccount] = useState(false);

  // Open cash register
  const [openRegisterOpen, setOpenRegisterOpen] = useState(false);
  const [registerFloat, setRegisterFloat] = useState("0");
  const [openingRegister, setOpeningRegister] = useState(false);
  const [closingRegister, setClosingRegister] = useState(false);

  // New manual movement
  const [newMovementOpen, setNewMovementOpen] = useState(false);
  const [movBankAccountId, setMovBankAccountId] = useState("");
  const [movDirection, setMovDirection] = useState<BankTransactionDirection>("out");
  const [movCategory, setMovCategory] = useState<BankTransactionCategory>("other");
  const [movDescription, setMovDescription] = useState("");
  const [movAmount, setMovAmount] = useState("");
  const [movDate, setMovDate] = useState(todayIso());
  const [savingMovement, setSavingMovement] = useState(false);

  // Reconciliation
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [unreconciledRows, setUnreconciledRows] = useState<UnreconciledRow[]>([]);
  const [loadingUnreconciled, setLoadingUnreconciled] = useState(false);
  const [invoiceQuery, setInvoiceQuery] = useState<Record<string, string>>({});
  const [invoiceResults, setInvoiceResults] = useState<Record<string, { id: string; invoice_number: string; contactName: string }[]>>({});
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/banking?month=${month}`);
      const body = await res.json();
      setData(body as BankingData);
    } catch (err) {
      console.error("Failed to fetch banking data:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [month, t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
  }, [month]);

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  async function handleCreateAccount() {
    if (!accName.trim()) {
      toast.error(tAcc("nameRequired"));
      return;
    }
    setSavingAccount(true);
    try {
      const res = await fetch("/api/billing/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accName.trim(),
          bank_name: accBankName.trim() || undefined,
          account_number_last4: accLast4.trim() || undefined,
          opening_balance: Number(accOpeningBalance) || 0,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "failed");
      toast.success(tAcc("created"));
      setNewAccountOpen(false);
      setAccName("");
      setAccBankName("");
      setAccLast4("");
      setAccOpeningBalance("0");
      await fetchData();
    } catch (err) {
      console.error("Create bank account error:", err);
      toast.error(err instanceof Error ? err.message : tAcc("createFailed"));
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleOpenRegister() {
    setOpeningRegister(true);
    try {
      const res = await fetch("/api/billing/cash-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opening_balance: Number(registerFloat) || 0 }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "failed");
      toast.success(t("openRegister.opened"));
      setOpenRegisterOpen(false);
      setRegisterFloat("0");
      await fetchData();
    } catch (err) {
      console.error("Open cash register error:", err);
      toast.error(err instanceof Error ? err.message : t("openRegister.openFailed"));
    } finally {
      setOpeningRegister(false);
    }
  }

  async function handleCloseRegister() {
    if (!window.confirm(t("closeRegister.confirm"))) return;
    setClosingRegister(true);
    try {
      const res = await fetch("/api/billing/cash-register/close", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "failed");
      toast.success(t("closeRegister.closed"));
      await fetchData();
    } catch (err) {
      console.error("Close cash register error:", err);
      toast.error(err instanceof Error ? err.message : t("closeRegister.closeFailed"));
    } finally {
      setClosingRegister(false);
    }
  }

  function openNewMovement() {
    setMovBankAccountId(data?.bankAccounts[0]?.id ?? "");
    setMovDirection("out");
    setMovCategory("other");
    setMovDescription("");
    setMovAmount("");
    setMovDate(todayIso());
    setNewMovementOpen(true);
  }

  async function handleSaveMovement() {
    if (!movBankAccountId) {
      toast.error(t("newMovement.accountRequired"));
      return;
    }
    if (!movDescription.trim() || !movAmount || Number(movAmount) <= 0) {
      toast.error(tAcc("requiredFields"));
      return;
    }
    setSavingMovement(true);
    try {
      const res = await fetch(`/api/billing/bank-accounts/${movBankAccountId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: movDirection,
          category: movCategory,
          description: movDescription.trim(),
          amount: Number(movAmount),
          transaction_date: movDate,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "failed");
      toast.success(tAcc("transactionCreated"));
      setNewMovementOpen(false);
      await fetchData();
    } catch (err) {
      console.error("Save movement error:", err);
      toast.error(err instanceof Error ? err.message : tAcc("transactionCreateFailed"));
    } finally {
      setSavingMovement(false);
    }
  }

  async function openReconcile() {
    setReconcileOpen(true);
    setLoadingUnreconciled(true);
    try {
      const { data: rows, error } = await supabase
        .from("bank_transactions")
        .select("id, description, amount, transaction_date, bank_account_id")
        .eq("direction", "in")
        .eq("category", "other")
        .is("invoice_id", null)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      setUnreconciledRows((rows ?? []) as UnreconciledRow[]);
    } catch (err) {
      console.error("Load unreconciled transactions error:", err);
      toast.error(t("unreconciled.loadFailed"));
    } finally {
      setLoadingUnreconciled(false);
    }
  }

  async function searchInvoicesFor(txId: string, query: string) {
    setInvoiceQuery((prev) => ({ ...prev, [txId]: query }));
    if (!query.trim()) {
      setInvoiceResults((prev) => ({ ...prev, [txId]: [] }));
      return;
    }
    const { data: rows } = await supabase
      .from("invoices")
      .select("id, invoice_number, contact:contacts(name, phone)")
      .ilike("invoice_number", `%${query.trim()}%`)
      .limit(6);
    const results = ((rows ?? []) as { id: string; invoice_number: string; contact: { name: string | null; phone: string } | { name: string | null; phone: string }[] | null }[]).map(
      (r) => {
        const contact = Array.isArray(r.contact) ? r.contact[0] : r.contact;
        return { id: r.id, invoice_number: r.invoice_number, contactName: contact?.name || contact?.phone || "" };
      },
    );
    setInvoiceResults((prev) => ({ ...prev, [txId]: results }));
  }

  async function linkInvoice(tx: UnreconciledRow, invoiceId: string) {
    setLinkingId(tx.id);
    try {
      const res = await fetch(`/api/billing/bank-accounts/${tx.bank_account_id}/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      if (!res.ok) throw new Error("failed");
      toast.success(t("unreconciled.linked"));
      setUnreconciledRows((prev) => prev.filter((r) => r.id !== tx.id));
      await fetchData();
    } catch (err) {
      console.error("Link invoice error:", err);
      toast.error(t("unreconciled.linkFailed"));
    } finally {
      setLinkingId(null);
    }
  }

  function handleExport() {
    if (!data) return;
    const header = ["Fecha", "Concepto", "Referencia", "Cuenta", "Monto", "Saldo"];
    const rows = data.ledger.map((m) => [
      m.at.slice(0, 10),
      m.concept,
      m.ref,
      m.bucketLabel,
      String(m.amount),
      String(m.runningBalance),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movimientos-${data.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
  const currency = data?.currency ?? "USD";

  return (
    <div className="space-y-6">
      <PageHeader icon={Landmark} title={t("title")} description={t("subtitle")} />

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card className={data.cashRegister ? undefined : "border-dashed"}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Wallet className="size-4" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-bold text-foreground">{t("cash.title")}</p>
                    <p className="text-xs text-muted-foreground">{t("cash.subtitle")}</p>
                  </div>
                  <span
                    className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      data.cashRegister ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {data.cashRegister ? t("cash.openChip") : t("cash.closedChip")}
                  </span>
                </div>
                {data.cashRegister ? (
                  <>
                    <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
                      {formatCurrency(data.cashRegister.balance, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("cash.detail", {
                        opening: formatCurrency(data.cashRegister.opening_balance, currency),
                        cashIn: formatCurrency(data.cashRegister.cashIn, currency),
                        cashExpenses: formatCurrency(data.cashRegister.cashExpenses, currency),
                      })}
                    </p>
                  </>
                ) : (
                  <Button type="button" size="sm" onClick={() => setOpenRegisterOpen(true)} className="mt-3 w-full text-xs">
                    {t("openRegister.title")}
                  </Button>
                )}
              </CardContent>
            </Card>

            {data.bankAccounts.map((acc) => (
              <Card key={acc.id} className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => setSelectedAccount(acc)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Landmark className="size-4" />
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-bold text-foreground">
                        {acc.name}
                        {acc.account_number_last4 ? ` · ${acc.account_number_last4}` : ""}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{acc.bank_name || t("account.defaultMeta")}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
                    {formatCurrency(acc.computed_balance ?? acc.opening_balance, acc.currency || currency)}
                  </p>
                </CardContent>
              </Card>
            ))}

            <button
              type="button"
              onClick={() => setNewAccountOpen(true)}
              className="flex min-h-[112px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Plus className="size-4" />
              {t("account.add")}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_292px] lg:items-start">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground capitalize">{t("ledger.title", { month: monthLabel })}</h3>
                  <p className="text-xs text-muted-foreground">{t("ledger.subtitle")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-md border border-border">
                    <button type="button" onClick={() => shiftMonth(-1)} className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground">
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <span className="px-1 text-xs font-medium capitalize text-foreground">{monthLabel}</span>
                    <button type="button" onClick={() => shiftMonth(1)} className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground">
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleExport} className="text-xs">
                    <Download className="size-3.5" />
                    {t("ledger.export")}
                  </Button>
                  <Button type="button" size="sm" onClick={openNewMovement} disabled={data.bankAccounts.length === 0} className="text-xs">
                    <Plus className="size-3.5" />
                    {t("ledger.newMovement")}
                  </Button>
                </div>
              </div>

              {data.ledger.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{t("ledger.empty")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid min-w-[640px] grid-cols-[0.8fr_1.8fr_1fr_1fr_1fr] gap-3 bg-muted/40 px-4 py-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">
                    <span>{t("ledger.columns.date")}</span>
                    <span>{t("ledger.columns.concept")}</span>
                    <span>{t("ledger.columns.account")}</span>
                    <span className="text-right">{t("ledger.columns.amount")}</span>
                    <span className="text-right">{t("ledger.columns.balance")}</span>
                  </div>
                  {data.ledger.map((m) => (
                    <div
                      key={m.id}
                      className="grid min-w-[640px] grid-cols-[0.8fr_1.8fr_1fr_1fr_1fr] items-center gap-3 border-t border-border px-4 py-3"
                    >
                      <span className="text-xs text-muted-foreground">{dateFormatter.format(new Date(m.at))}</span>
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-sm text-foreground">{m.concept}</p>
                        <p className={`truncate text-xs ${m.unreconciled ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                          {m.ref}
                        </p>
                      </div>
                      <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{m.bucketLabel}</span>
                      <span className={`text-right text-sm font-bold tabular-nums ${m.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {m.amount >= 0 ? "+" : "−"}
                        {formatCurrency(Math.abs(m.amount), m.currency)}
                      </span>
                      <span className="text-right text-xs tabular-nums text-muted-foreground">{formatCurrency(m.runningBalance, m.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3.5">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-bold text-foreground">{t("cashCorte.title")}</h3>
                  {data.cashRegister ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {t("cashCorte.subtitle", { date: dateFormatter.format(new Date(data.cashRegister.opened_at)) })}
                      </p>
                      <div className="mt-3.5 flex flex-col gap-2.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("cashCorte.opening")}</span>
                          <span className="font-semibold tabular-nums text-foreground">{formatCurrency(data.cashRegister.opening_balance, currency)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("cashCorte.cashIn")}</span>
                          <span className="font-semibold tabular-nums text-foreground">{formatCurrency(data.cashRegister.cashIn, currency)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("cashCorte.cashExpenses")}</span>
                          <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                            −{formatCurrency(data.cashRegister.cashExpenses, currency)}
                          </span>
                        </div>
                        <div className="h-px bg-border" />
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-foreground">{t("cashCorte.balance")}</span>
                          <span className="font-bold tabular-nums text-foreground">{formatCurrency(data.cashRegister.balance, currency)}</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCloseRegister}
                        disabled={closingRegister}
                        className="mt-3.5 w-full bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                      >
                        {closingRegister ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        {t("cashCorte.closeButton")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="mt-1.5 text-xs text-muted-foreground">{t("cashCorte.noRegister")}</p>
                      <Button type="button" size="sm" onClick={() => setOpenRegisterOpen(true)} className="mt-3 w-full text-xs">
                        {t("cashCorte.openButton")}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold tracking-wide text-amber-600 uppercase dark:text-amber-400">{t("unreconciled.title")}</p>
                  {data.unreconciled.count > 0 ? (
                    <>
                      <p className="mt-1.5 text-2xl font-bold text-amber-700 tabular-nums dark:text-amber-400">
                        {t("unreconciled.count", { count: data.unreconciled.count })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("unreconciled.caption", { amount: formatCurrency(data.unreconciled.total, currency) })}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={openReconcile}
                        className="mt-3 w-full bg-amber-600 text-xs text-white hover:bg-amber-700"
                      >
                        <Link2 className="size-3.5" />
                        {t("unreconciled.reconcileNow")}
                      </Button>
                    </>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">{t("unreconciled.none")}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* New bank account */}
      <Dialog open={newAccountOpen} onOpenChange={setNewAccountOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{tAcc("newAccount")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tAcc("form.name")}</Label>
              <Input value={accName} onChange={(e) => setAccName(e.target.value)} placeholder={tAcc("form.namePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tAcc("form.bankName")}</Label>
              <Input value={accBankName} onChange={(e) => setAccBankName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tAcc("form.last4")}</Label>
                <Input value={accLast4} onChange={(e) => setAccLast4(e.target.value)} maxLength={4} placeholder="1234" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tAcc("form.openingBalance")}</Label>
                <Input type="number" step="0.01" value={accOpeningBalance} onChange={(e) => setAccOpeningBalance(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewAccountOpen(false)} disabled={savingAccount}>
              {tAcc("form.cancel")}
            </Button>
            <Button size="sm" onClick={handleCreateAccount} disabled={savingAccount}>
              {savingAccount ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {tAcc("form.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open cash register */}
      <Dialog open={openRegisterOpen} onOpenChange={setOpenRegisterOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("openRegister.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("openRegister.openingBalance")}</Label>
            <Input type="number" min="0" step="0.01" value={registerFloat} onChange={(e) => setRegisterFloat(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenRegisterOpen(false)} disabled={openingRegister}>
              {tAcc("form.cancel")}
            </Button>
            <Button size="sm" onClick={handleOpenRegister} disabled={openingRegister}>
              {openingRegister ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("openRegister.open")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New manual movement */}
      <Dialog open={newMovementOpen} onOpenChange={setNewMovementOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{tAcc("newTransaction")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("newMovement.accountLabel")}</Label>
              <select
                value={movBankAccountId}
                onChange={(e) => setMovBankAccountId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {(data?.bankAccounts ?? []).map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tAcc("form.direction")}</Label>
                <select
                  value={movDirection}
                  onChange={(e) => setMovDirection(e.target.value as BankTransactionDirection)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {DIRECTIONS.map((d) => (
                    <option key={d} value={d}>
                      {tAcc(`directions.${d}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tAcc("form.category")}</Label>
                <select
                  value={movCategory}
                  onChange={(e) => setMovCategory(e.target.value as BankTransactionCategory)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {tAcc(`categories.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tAcc("form.description")}</Label>
              <Input value={movDescription} onChange={(e) => setMovDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tAcc("form.amount")}</Label>
                <Input type="number" min="0.01" step="0.01" value={movAmount} onChange={(e) => setMovAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tAcc("form.date")}</Label>
                <Input type="date" value={movDate} onChange={(e) => setMovDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewMovementOpen(false)} disabled={savingMovement}>
              {tAcc("form.cancel")}
            </Button>
            <Button size="sm" onClick={handleSaveMovement} disabled={savingMovement}>
              {savingMovement ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {tAcc("form.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconciliation */}
      <Dialog open={reconcileOpen} onOpenChange={setReconcileOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("unreconciled.dialogTitle")}</DialogTitle>
          </DialogHeader>
          {loadingUnreconciled ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : unreconciledRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("unreconciled.none")}</p>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {unreconciledRows.map((row) => (
                <div key={row.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{row.description}</p>
                      <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(row.transaction_date))}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(row.amount, currency)}
                    </span>
                  </div>
                  <div className="relative mt-2">
                    <Input
                      value={invoiceQuery[row.id] ?? ""}
                      onChange={(e) => void searchInvoicesFor(row.id, e.target.value)}
                      placeholder={t("unreconciled.searchPlaceholder")}
                      className="h-8 text-xs"
                    />
                    {(invoiceResults[row.id]?.length ?? 0) > 0 && (
                      <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                        {invoiceResults[row.id].map((inv) => (
                          <button
                            key={inv.id}
                            type="button"
                            disabled={linkingId === row.id}
                            onClick={() => linkInvoice(row, inv.id)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted"
                          >
                            <span className="font-medium text-foreground">{inv.invoice_number}</span>
                            <span className="text-muted-foreground">{inv.contactName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedAccount && (
        <BankAccountDetail
          account={selectedAccount}
          open={!!selectedAccount}
          onOpenChange={(open) => !open && setSelectedAccount(null)}
          onChanged={fetchData}
        />
      )}
    </div>
  );
}
