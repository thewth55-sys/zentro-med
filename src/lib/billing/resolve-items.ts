import type { SupabaseClient } from "@supabase/supabase-js";

import { computeDocumentTotals, computeLineTotal } from "./totals";

export interface RawLineInput {
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_id?: string | null;
}

export interface ResolvedLine {
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_id: string | null;
  tax_rate_snapshot: number;
  line_total: number;
  position: number;
}

/**
 * Server-side line resolution shared by the quotes and invoices POST
 * routes. `quantity`/`unit_price`/`tax_id` are legitimate client
 * input (staff can override a line's price or pick any tax) — but the
 * TAX RATE and every total are derived values that must never be
 * trusted from the client. This looks up each `tax_id`'s current rate
 * from the account's own `taxes` table (RLS-scoped by the caller's
 * client) and recomputes every total from scratch.
 *
 * Throws a plain Error with a user-facing message on invalid input —
 * callers should catch and turn it into a 400.
 */
export async function resolveBillingLines(
  supabase: SupabaseClient,
  accountId: string,
  rawItems: RawLineInput[]
): Promise<{ items: ResolvedLine[]; subtotal: number; taxTotal: number; total: number }> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("At least one line item is required");
  }

  const taxIds = [...new Set(rawItems.map((i) => i.tax_id).filter((id): id is string => !!id))];
  const taxRateById = new Map<string, number>();
  if (taxIds.length > 0) {
    const { data: taxes, error } = await supabase
      .from("taxes")
      .select("id, rate")
      .eq("account_id", accountId)
      .in("id", taxIds);
    if (error) throw new Error("Failed to resolve tax rates");
    for (const tax of taxes ?? []) taxRateById.set(tax.id, Number(tax.rate));
  }

  const items: ResolvedLine[] = rawItems.map((raw, index) => {
    const quantity = Number(raw.quantity);
    const unitPrice = Number(raw.unit_price);
    if (!raw.description?.trim()) throw new Error("Each line item needs a description");
    if (!(quantity > 0)) throw new Error("Quantity must be greater than zero");
    if (!(unitPrice >= 0)) throw new Error("Unit price cannot be negative");

    const taxRateSnapshot = raw.tax_id ? (taxRateById.get(raw.tax_id) ?? 0) : 0;

    return {
      product_id: raw.product_id || null,
      description: raw.description.trim(),
      quantity,
      unit_price: unitPrice,
      tax_id: raw.tax_id || null,
      tax_rate_snapshot: taxRateSnapshot,
      line_total: computeLineTotal(quantity, unitPrice),
      position: index,
    };
  });

  const { subtotal, taxTotal, total } = computeDocumentTotals(items);
  return { items, subtotal, taxTotal, total };
}
