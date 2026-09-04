import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { reconcileDeposit } from "@/lib/payments/reconcile-deposit";
import { DepositConfirmation } from "@/components/public-booking/deposit-confirmation";

export const metadata: Metadata = { title: "Confirmación de pago" };

/**
 * Landing page after a deposit checkout (Stripe/Mercado Pago/Clip) —
 * `?deposit=<appointment_deposits.external_reference>`.
 *
 * Does ONE active reconciliation (reconcileDeposit — actively asks the
 * gateway, not just reads the DB) before first paint, then hands off
 * to a client component that keeps polling for a short while if it's
 * still pending. A passive read-once used to leave visitors staring
 * at "confirmando tu pago…" forever whenever the gateway's webhook
 * was slow or never arrived, even though the charge had already gone
 * through — this self-heals instead of depending entirely on the
 * webhook landing first.
 */
export default async function DepositConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ deposit?: string }>;
}) {
  const { slug } = await params;
  const { deposit } = await searchParams;
  if (!deposit) notFound();

  const admin = supabaseAdmin();
  const { data: account } = await admin
    .from("accounts")
    .select("id, name")
    .eq("public_booking_slug", slug)
    .maybeSingle();
  if (!account) notFound();

  const { data: depositRow } = await admin
    .from("appointment_deposits")
    .select("id, status, amount, currency, appointment_id")
    .eq("external_reference", deposit)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!depositRow) notFound();

  const result =
    depositRow.status === "pending" ? await reconcileDeposit(admin, account.id, depositRow.id) : null;
  const status = result?.status ?? depositRow.status;
  const appointmentId = result?.appointmentId ?? depositRow.appointment_id;

  const { data: appointmentRow } = await admin
    .from("appointments")
    .select("start_at, room:rooms(name, address)")
    .eq("id", appointmentId)
    .maybeSingle();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-16 text-foreground">
      <DepositConfirmation
        slug={slug}
        depositRef={deposit}
        accountName={account.name}
        initialStatus={status as "pending" | "paid" | "failed" | "expired" | "canceled"}
        amount={depositRow.amount}
        currency={depositRow.currency}
        initialAppointment={
          appointmentRow
            ? {
                start_at: appointmentRow.start_at,
                room: (appointmentRow.room as unknown as { name: string; address: string | null } | null) ?? null,
              }
            : null
        }
      />
    </div>
  );
}
