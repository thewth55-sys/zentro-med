import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/auth/account";
import { requireSectionAccess } from "@/lib/auth/section-access";

/**
 * POST /api/billing/cash-register/close — closes the account's
 * currently open shift, snapshotting its final total (see
 * 118_cash_registers_and_reconciliation.sql's comment on why this is
 * a snapshot rather than always-recomputed).
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireSectionAccess("agent", "billing", request);

    const { data: register, error: fetchError } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("account_id", accountId)
      .eq("status", "open")
      .maybeSingle();
    if (fetchError || !register) {
      return NextResponse.json({ error: "There is no open cash register to close" }, { status: 400 });
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
    const closingBalance = Number(register.opening_balance) + cashIn - cashExpenses;

    const { data: closed, error } = await supabase
      .from("cash_registers")
      .update({ status: "closed", closed_at: new Date().toISOString(), closed_by: userId, closing_balance: closingBalance })
      .eq("id", register.id)
      .eq("account_id", accountId)
      .select("*")
      .single();
    if (error) {
      console.error("[cash-register close POST] error:", error);
      return NextResponse.json({ error: "Failed to close the cash register" }, { status: 500 });
    }

    return NextResponse.json({ register: closed });
  } catch (err) {
    return toErrorResponse(err);
  }
}
