import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";

export const metadata: Metadata = { title: "Confirmación de pago" };

/**
 * Landing page after a deposit checkout (Stripe/Mercado Pago/Clip) —
 * `?deposit=<appointment_deposits.external_reference>`. Reads the
 * CURRENT status once, server-side; doesn't poll. The webhook is
 * usually faster than the redirect back here, but if it hasn't landed
 * yet this shows a "we're confirming" state rather than a false
 * negative — the appointment itself was already created before the
 * visitor ever left for checkout, so nothing is lost either way.
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
    .select("status, amount, currency, appointment:appointments(start_at)")
    .eq("external_reference", deposit)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!depositRow) notFound();

  const appointment = depositRow.appointment as unknown as { start_at: string } | null;
  const dateLabel = appointment
    ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(appointment.start_at),
      )
    : null;
  const amountLabel = new Intl.NumberFormat("es-MX", { style: "currency", currency: depositRow.currency }).format(
    depositRow.amount,
  );

  const state =
    depositRow.status === "paid"
      ? { Icon: CheckCircle2, color: "text-green-600", title: "¡Anticipo recibido!" }
      : depositRow.status === "failed" || depositRow.status === "canceled" || depositRow.status === "expired"
        ? { Icon: XCircle, color: "text-destructive", title: "El pago no se completó" }
        : { Icon: Clock, color: "text-amber-600", title: "Estamos confirmando tu pago…" };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-16 text-foreground">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center">
        <state.Icon className={`mx-auto size-12 ${state.color}`} />
        <h1 className="mt-4 text-lg font-semibold">{state.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Anticipo de {amountLabel} para tu cita{dateLabel ? ` del ${dateLabel}` : ""} con {account.name}.
        </p>
        {depositRow.status === "pending" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Tu cita ya está reservada. Si el pago se confirma, no necesitas hacer nada más — si tienes dudas,
            contáctanos directamente.
          </p>
        )}
      </div>
    </div>
  );
}
