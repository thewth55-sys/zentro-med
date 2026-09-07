import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";

/**
 * GET  /api/billing/cash-register — the account's currently open shift
 *      (or null), with its real cash-in/cash-out totals since it
 *      opened — cash payments/expenses that were never assigned to a
 *      real bank_accounts row (see 118_cash_registers_and_reconciliation.sql).
 * POST /api/billing/cash-register — open a new shift. Fails if one is
 *      already open (partial unique index enforces this at the DB
 *      level too — this just gives a clean error instead of a raw
 *      constraint violation).
 */
export async function GET() {
  try {
    const { supabase, accountId } = await requireRole("viewer");

    const { data: register, error } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("account_id", accountId)
      .eq("status", "open")
      .maybeSingle();
    if (error) {
      console.error("[cash-register GET] error:", error);
      return NextResponse.json({ error: "Failed to load the cash register" }, { status: 500 });
    }
    if (!register) {
      return NextResponse.json({ register: null });
    }

    const [{ data: payments }, { data: expenses }] = await Promise.all([
      supabase
        .from("payments")
        .select("amount")
        .eq("account_id", accountId)
        .eq("method", "cash")
        .is("bank_account_id", null)
        .gte("paid_at", register.opened_at),
      supabase
        .from("expenses")
        .select("amount")
        .eq("account_id", accountId)
        .eq("payment_method", "cash")
        .is("bank_account_id", null)
        .gte("expense_date", register.opened_at.slice(0, 10)),
    ]);

    const cashIn = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const cashExpenses = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

    return NextResponse.json({
      register: {
        ...register,
        cashIn,
        cashExpenses,
        balance: Number(register.opening_balance) + cashIn - cashExpenses,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole("agent");
    const body = await request.json().catch(() => ({}));

    const openingBalance = body?.opening_balance !== undefined ? Number(body.opening_balance) : 0;
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      return NextResponse.json({ error: "opening_balance must be a non-negative number" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("cash_registers")
      .select("id")
      .eq("account_id", accountId)
      .eq("status", "open")
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "There is already an open cash register for today's shift" }, { status: 400 });
    }

    const { data: register, error } = await supabase
      .from("cash_registers")
      .insert({ account_id: accountId, opening_balance: openingBalance, opened_by: userId })
      .select("*")
      .single();
    if (error) {
      console.error("[cash-register POST] error:", error);
      return NextResponse.json({ error: "Failed to open the cash register" }, { status: 500 });
    }

    return NextResponse.json({ register: { ...register, cashIn: 0, cashExpenses: 0, balance: openingBalance } }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
