import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/auth/account";
import { requireSectionAccess } from "@/lib/auth/section-access";
import type { BankAccount, PaymentMethod } from "@/types";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "efectivo",
  card: "terminal",
  transfer: "transferencia",
  other: "otro",
};

interface RawMovement {
  /** ISO date/datetime — mixed granularity (payments have a real
   *  timestamp, expenses/manual transactions/register-opens are
   *  date-only) is fine for day-level sorting, which is all the
   *  ledger needs. */
  at: string;
  concept: string;
  ref: string;
  amount: number;
  id: string;
  unreconciled?: boolean;
}

interface Bucket {
  id: string;
  label: string;
  currency: string;
  opening: number;
  movements: RawMovement[];
}

/**
 * GET /api/billing/banking?month=YYYY-MM — everything the "Banco y
 * caja" page needs in one round trip: each bank account's computed
 * balance, the open cash-register shift (if any), how many deposits
 * are waiting to be reconciled to an invoice, and one combined
 * chronological ledger across every account + the cash drawer.
 *
 * The running balance per row is computed from FULL history (not just
 * the requested month) so it's correct even for the first row shown —
 * only the final list returned to the client is filtered down to the
 * month. Realistic data volume for a single clinic (a few hundred
 * payments/expenses/manual entries total) makes fetching full history
 * on every call cheap enough to not need a "balance as of month start"
 * running total instead.
 */
export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireSectionAccess("viewer", "banking", request);
    const url = new URL(request.url);

    const now = new Date();
    const monthParam = url.searchParams.get("month");
    const [year, monthNum] = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam.split("-").map(Number)
      : [now.getFullYear(), now.getMonth() + 1];
    const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
    const monthEndExclusive = new Date(Date.UTC(year, monthNum, 1));

    const { data: account } = await supabase.from("accounts").select("default_currency").eq("id", accountId).maybeSingle();
    const defaultCurrency = account?.default_currency ?? "USD";

    const [
      { data: bankAccounts },
      { data: openRegister },
      { data: allRegisters },
      { data: payments },
      { data: expenses },
      { data: transactions },
    ] = await Promise.all([
      supabase.from("bank_accounts").select("*").eq("account_id", accountId).order("created_at", { ascending: true }),
      supabase.from("cash_registers").select("*").eq("account_id", accountId).eq("status", "open").maybeSingle(),
      supabase.from("cash_registers").select("id, opening_balance, opened_at").eq("account_id", accountId),
      supabase
        .from("payments")
        .select("id, amount, method, paid_at, bank_account_id, invoice:invoices(invoice_number, contact:contacts(name, phone))")
        .eq("account_id", accountId),
      supabase
        .from("expenses")
        .select("id, amount, description, vendor, expense_date, payment_method, bank_account_id")
        .eq("account_id", accountId),
      supabase
        .from("bank_transactions")
        .select("id, amount, direction, category, description, transaction_date, bank_account_id, invoice_id")
        .eq("account_id", accountId),
    ]);

    // ------------------------------------------------------------
    // Bank accounts' computed_balance — same formula as
    // /api/billing/bank-accounts (kept in sync manually; both are
    // small and unlikely to change independently).
    // ------------------------------------------------------------
    const buckets = new Map<string, Bucket>();
    buckets.set("cash", { id: "cash", label: "Caja del consultorio", currency: defaultCurrency, opening: 0, movements: [] });
    for (const acc of (bankAccounts ?? []) as BankAccount[]) {
      buckets.set(acc.id, { id: acc.id, label: acc.name, currency: acc.currency, opening: Number(acc.opening_balance), movements: [] });
    }

    for (const reg of allRegisters ?? []) {
      buckets.get("cash")!.movements.push({
        id: `register-${reg.id}`,
        at: reg.opened_at,
        concept: "Fondo inicial de caja",
        ref: "Apertura de turno",
        amount: Number(reg.opening_balance),
      });
    }

    for (const p of (payments ?? []) as unknown as {
      id: string;
      amount: number;
      method: PaymentMethod;
      paid_at: string;
      bank_account_id: string | null;
      invoice: unknown;
    }[]) {
      const bucketKey = p.bank_account_id ?? (p.method === "cash" ? "cash" : null);
      if (!bucketKey || !buckets.has(bucketKey)) continue;
      const invoiceRaw = Array.isArray(p.invoice) ? p.invoice[0] : p.invoice;
      const invoice = (invoiceRaw ?? null) as { invoice_number: string; contact: unknown } | null;
      const contactRaw = invoice ? (Array.isArray(invoice.contact) ? invoice.contact[0] : invoice.contact) : null;
      const contact = (contactRaw ?? null) as { name: string | null; phone: string } | null;
      buckets.get(bucketKey)!.movements.push({
        id: `payment-${p.id}`,
        at: p.paid_at,
        concept: contact?.name || contact?.phone ? `Pago de ${contact?.name || contact?.phone}` : "Pago recibido",
        ref: invoice ? `${invoice.invoice_number} · ${METHOD_LABELS[p.method]}` : METHOD_LABELS[p.method],
        amount: Number(p.amount),
      });
    }

    for (const e of (expenses ?? []) as {
      id: string;
      amount: number;
      description: string;
      vendor: string | null;
      expense_date: string;
      payment_method: PaymentMethod;
      bank_account_id: string | null;
    }[]) {
      const bucketKey = e.bank_account_id ?? (e.payment_method === "cash" ? "cash" : null);
      if (!bucketKey || !buckets.has(bucketKey)) continue;
      buckets.get(bucketKey)!.movements.push({
        id: `expense-${e.id}`,
        at: e.expense_date,
        concept: e.description,
        ref: e.vendor ?? METHOD_LABELS[e.payment_method],
        amount: -Number(e.amount),
      });
    }

    for (const t of (transactions ?? []) as {
      id: string;
      amount: number;
      direction: "in" | "out";
      category: string;
      description: string;
      transaction_date: string;
      bank_account_id: string;
      invoice_id: string | null;
    }[]) {
      const bucket = buckets.get(t.bank_account_id);
      if (!bucket) continue;
      const unreconciled = t.direction === "in" && t.category === "other" && !t.invoice_id;
      bucket.movements.push({
        id: `tx-${t.id}`,
        at: t.transaction_date,
        concept: t.description,
        ref: unreconciled ? "Transferencia recibida · por conciliar" : t.category,
        amount: t.direction === "in" ? Number(t.amount) : -Number(t.amount),
        unreconciled,
      });
    }

    // Running balance per bucket, ascending, then keep only the
    // requested month for the response (see function comment).
    const ledger: (RawMovement & { bucketId: string; bucketLabel: string; currency: string; runningBalance: number })[] = [];
    for (const bucket of buckets.values()) {
      const sorted = [...bucket.movements].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
      let running = bucket.opening;
      for (const m of sorted) {
        running += m.amount;
        const at = new Date(m.at);
        if (at >= monthStart && at < monthEndExclusive) {
          ledger.push({ ...m, bucketId: bucket.id, bucketLabel: bucket.label, currency: bucket.currency, runningBalance: running });
        }
      }
    }
    ledger.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    // Cash register card — real cash in/out since the shift opened.
    let cashRegister: (Record<string, unknown> & { cashIn: number; cashExpenses: number; balance: number }) | null = null;
    if (openRegister) {
      const cashBucket = buckets.get("cash")!;
      const sinceOpen = cashBucket.movements.filter((m) => new Date(m.at) >= new Date(openRegister.opened_at) && !m.id.startsWith("register-"));
      const cashIn = sinceOpen.filter((m) => m.amount > 0).reduce((sum, m) => sum + m.amount, 0);
      const cashExpenses = sinceOpen.filter((m) => m.amount < 0).reduce((sum, m) => sum - m.amount, 0);
      cashRegister = {
        ...openRegister,
        cashIn,
        cashExpenses,
        balance: Number(openRegister.opening_balance) + cashIn - cashExpenses,
      };
    }

    // Unreconciled deposits — all-time, not month-scoped (same
    // "current state, not a period snapshot" reasoning as invoices'
    // "Cobranza vencida").
    const unreconciledTx = (transactions ?? []).filter(
      (t) => t.direction === "in" && t.category === "other" && !t.invoice_id,
    );
    const unreconciledTotal = unreconciledTx.reduce((sum, t) => sum + Number(t.amount), 0);

    const bankAccountsWithBalance = (bankAccounts ?? []).map((acc: BankAccount) => {
      const bucket = buckets.get(acc.id)!;
      const total = bucket.movements.reduce((sum, m) => sum + m.amount, 0);
      return { ...acc, computed_balance: bucket.opening + total };
    });

    return NextResponse.json({
      currency: defaultCurrency,
      month: `${year}-${String(monthNum).padStart(2, "0")}`,
      bankAccounts: bankAccountsWithBalance,
      cashRegister,
      unreconciled: { count: unreconciledTx.length, total: unreconciledTotal },
      ledger,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
