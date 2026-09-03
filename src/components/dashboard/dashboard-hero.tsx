"use client";

import Link from "next/link";
import { useLocale } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import type { TodayAppointmentItem } from "@/lib/dashboard/types";

interface Props {
  nextAppointment: TodayAppointmentItem | null;
  nextAppointmentLoading: boolean;
  /** Appointment whose [startAt, endAt] window contains "now", if any —
   *  derived by the caller from the already-loaded today's-appointments
   *  list, no query of its own. */
  currentAppointment: TodayAppointmentItem | null;
  /** Los 3 números que responden "qué necesito ver antes de la primera
   *  consulta" — `null` mientras cargan. `todayBilling` es saldo de
   *  facturas con vencimiento HOY (dato real, ver loadTodayBilling), no
   *  una proyección a partir de precios de servicio sin poblar. */
  citasHoyCount: number | null;
  sinConfirmarCount: number | null;
  todayBilling: number | null;
  statsLoading: boolean;
}

/**
 * Hero del Panel: saludo al médico, los 3 números del día, "en consulta
 * ahora" (si aplica) y la próxima cita. Las recomendaciones de Zen que
 * antes vivían aquí como una banda embebida ahora son su propio módulo
 * (`PrioritiesPanel`, montado justo debajo en page.tsx) con datos reales
 * en vez de un tip genérico.
 */
export function DashboardHero({
  nextAppointment,
  nextAppointmentLoading,
  currentAppointment,
  citasHoyCount,
  sinConfirmarCount,
  todayBilling,
  statsLoading,
}: Props) {
  const { profile, defaultCurrency } = useAuth();
  const locale = useLocale();

  const name = profile?.full_name?.trim();
  const title = profile?.title?.trim();
  const greeting = name ? `Hola, ${title ? `${title} ` : ""}${name}` : "Hola";
  const dateEyebrow = new Date()
    .toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();

  return (
    <section
      className="relative overflow-hidden rounded-2xl p-6 text-white shadow-md"
      style={{ background: "linear-gradient(120deg, #0F241A, #164A31)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(74,222,90,.35), transparent 70%)" }}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider text-emerald-100/60">{dateEyebrow}</p>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{greeting}</h1>
          <p className="mt-1 text-sm text-emerald-100/80">
            Tu clínica de un vistazo — esto es lo importante de hoy.
          </p>
        </div>

        {!nextAppointmentLoading && nextAppointment ? (
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 sm:shrink-0">
            <div className="text-[11px] text-emerald-100/70">Próxima cita</div>
            <div className="font-semibold text-white">{formatWhen(nextAppointment.startAt)}</div>
            <div className="text-xs text-emerald-100/70">
              {nextAppointment.patientName ?? "—"}
              {nextAppointment.serviceTypeName ? ` · ${nextAppointment.serviceTypeName}` : ""}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
          <div className="text-[11px] text-emerald-100/70">Citas hoy</div>
          <div className="text-2xl font-bold text-white">{statsLoading ? "—" : (citasHoyCount ?? 0)}</div>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
          <div className="text-[11px] text-emerald-100/70">Por cobrar hoy</div>
          <div className="text-2xl font-bold text-white">
            {statsLoading ? "—" : formatCurrency(todayBilling ?? 0, defaultCurrency)}
          </div>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
          <div className="text-[11px] text-emerald-100/70">Sin confirmar</div>
          <div className="text-2xl font-bold text-white">{statsLoading ? "—" : (sinConfirmarCount ?? 0)}</div>
        </div>
      </div>

      {currentAppointment ? (
        <div className="relative mt-5 flex flex-col gap-3 rounded-xl border border-white/15 bg-white/10 p-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-emerald-100/90">En consulta ahora</div>
              <div className="truncate text-sm font-medium text-white">
                {currentAppointment.patientName ?? "—"}
                {currentAppointment.serviceTypeName ? ` · ${currentAppointment.serviceTypeName}` : ""}
              </div>
            </div>
          </div>
          {currentAppointment.contactId ? (
            <Link
              href={`/contacts/${currentAppointment.contactId}`}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-[#06210F] transition hover:brightness-105 sm:w-auto"
            >
              Abrir ficha
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  if (sameDay) return `Hoy · ${time}`;
  if (isTomorrow) return `Mañana · ${time}`;
  return `${d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" })} · ${time}`;
}
