import type { SupabaseClient } from "@supabase/supabase-js";

export interface TopTreatment {
  label: string;
  total: number;
}

interface InvoiceItemRow {
  description: string;
  line_total: number;
  product: { name: string } | null;
}

/**
 * "Tratamientos más facturados" — suma `line_total` por producto
 * vinculado y, cuando la línea no tiene `product_id` (texto libre),
 * agrupa por su `description` tal cual — no hay una mejor clave sin
 * inventar una categoría genérica. Filtra por `invoices.issue_date`
 * (mismo rango que las tarjetas de arriba en Resumen) y excluye
 * borradores/anuladas, igual que `financial-summary.tsx`.
 */
export async function loadTopTreatments(
  db: SupabaseClient,
  from: string | null,
  to: string | null,
  limit = 5,
): Promise<TopTreatment[]> {
  let query = db
    .from("invoice_items")
    .select("description, line_total, product:products(name), invoices!inner(issue_date, status)")
    .not("invoices.status", "in", "(draft,void)");
  if (from) query = query.gte("invoices.issue_date", from);
  if (to) query = query.lte("invoices.issue_date", to);

  const { data, error } = await query;
  if (error) throw error;

  const byLabel = new Map<string, number>();
  for (const item of (data ?? []) as unknown as InvoiceItemRow[]) {
    const label = item.product?.name ?? item.description;
    byLabel.set(label, (byLabel.get(label) ?? 0) + Number(item.line_total));
  }

  return Array.from(byLabel.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
