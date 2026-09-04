"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

type DepositStatus = "pending" | "paid" | "failed" | "expired" | "canceled";

interface RoomInfo {
  name: string;
  address: string | null;
}

interface AppointmentInfo {
  start_at: string;
  room: RoomInfo | null;
}

interface Props {
  slug: string;
  depositRef: string;
  accountName: string;
  initialStatus: DepositStatus;
  amount: number;
  currency: string;
  initialAppointment: AppointmentInfo | null;
}

const POLL_INTERVAL_MS = 3000;
// ~30s of polling — the page already did one server-side reconcile
// before first paint (see confirmacion/page.tsx), so this only ever
// covers a webhook that's a few seconds slow, not the common case.
const MAX_POLLS = 10;

/**
 * Client half of the post-checkout confirmation page. Starts already
 * reconciled once (server-side, before first paint) — this only polls
 * `deposit-status` (which itself actively re-checks the gateway, not
 * just the DB) when that first check STILL came back pending, so a
 * slow-but-real webhook gets a real "¡Cita confirmada!" instead of a
 * spinner that never resolves without a manual reload.
 */
export function DepositConfirmation({
  slug,
  depositRef,
  accountName,
  initialStatus,
  amount,
  currency,
  initialAppointment,
}: Props) {
  const [status, setStatus] = useState<DepositStatus>(initialStatus);
  const [appointment, setAppointment] = useState<AppointmentInfo | null>(initialAppointment);
  const [pollsLeft, setPollsLeft] = useState(MAX_POLLS);

  useEffect(() => {
    if (status !== "pending" || pollsLeft <= 0) return;
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/public/booking/${encodeURIComponent(slug)}/deposit-status?ref=${encodeURIComponent(depositRef)}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.status) setStatus(data.status);
          if (data.appointment) setAppointment(data.appointment);
        }
      } catch {
        // Falla de red puntual — el siguiente intento del poll lo reintenta solo.
      } finally {
        setPollsLeft((p) => p - 1);
      }
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(handle);
  }, [status, pollsLeft, slug, depositRef]);

  const dateLabel = appointment
    ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(appointment.start_at),
      )
    : null;
  const amountLabel = new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
  const stillChecking = status === "pending" && pollsLeft > 0;

  const state =
    status === "paid"
      ? { Icon: CheckCircle2, color: "text-green-600", title: "¡Cita confirmada!" }
      : status === "failed" || status === "canceled" || status === "expired"
        ? { Icon: XCircle, color: "text-destructive", title: "El pago no se completó" }
        : { Icon: Clock, color: "text-amber-600", title: stillChecking ? "Confirmando tu pago…" : "Anticipo pendiente" };

  return (
    <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center">
      <state.Icon className={`mx-auto size-12 ${state.color} ${stillChecking ? "animate-pulse" : ""}`} />
      <h1 className="mt-4 text-lg font-semibold">{state.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Anticipo de {amountLabel}
        {dateLabel ? ` para tu cita del ${dateLabel}` : ""} con {accountName}.
      </p>
      {appointment?.room?.name && (
        <p className="mt-1 text-sm text-muted-foreground">
          Consultorio: {appointment.room.name}
          {appointment.room.address ? ` · ${appointment.room.address}` : ""}
        </p>
      )}
      {status === "paid" && (
        <p className="mt-2 text-xs text-muted-foreground">Tu cita ya quedó agendada y confirmada.</p>
      )}
      {status === "pending" && (
        <p className="mt-2 text-xs text-muted-foreground">
          {stillChecking
            ? "Tu cita ya está reservada — esto puede tardar unos segundos."
            : "Tu cita ya está reservada. El anticipo sigue pendiente de confirmación — si tienes dudas, contáctanos directamente."}
        </p>
      )}
    </div>
  );
}
