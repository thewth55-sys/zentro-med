/**
 * Pure money-math helpers for the billing module — no I/O, safe to
 * unit test directly. Used by the quote/invoice forms for live totals
 * AND by the billing API routes to recompute an authoritative total
 * server-side from the submitted line items (never trust a
 * client-supplied subtotal/tax_total/total for a financial document).
 */

export interface BillingLineInput {
  quantity: number;
  unit_price: number;
  tax_rate_snapshot: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** quantity × unit_price, rounded to cents. */
export function computeLineTotal(quantity: number, unitPrice: number): number {
  return round2(quantity * unitPrice);
}

export interface DocumentTotals {
  subtotal: number;
  taxTotal: number;
  total: number;
}

/**
 * Sums line totals into subtotal, then applies each line's own
 * tax_rate_snapshot to its own line total (not a single blended rate
 * across the document) — different lines can carry different taxes.
 */
export function computeDocumentTotals(items: BillingLineInput[]): DocumentTotals {
  let subtotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const lineTotal = computeLineTotal(item.quantity, item.unit_price);
    subtotal += lineTotal;
    taxTotal += round2(lineTotal * (item.tax_rate_snapshot / 100));
  }

  subtotal = round2(subtotal);
  taxTotal = round2(taxTotal);

  return { subtotal, taxTotal, total: round2(subtotal + taxTotal) };
}
