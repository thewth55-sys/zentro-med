"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, Sparkles } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { COPILOT_NAME } from "@/lib/ai/copilot/branding";
import type { TodayAppointmentItem } from "@/lib/dashboard/types";

interface Props {
  nextAppointment: TodayAppointmentItem | null;
  nextAppointmentLoading: boolean;
}

/**
 * Hero del Panel: saludo al médico, próxima cita y las recomendaciones de
 * Zen INCORPORADAS (con CTA al chat). Reemplaza el header plano + la tarjeta
 * de próxima cita + la banda de recomendaciones sueltas.
 */
export function DashboardHero({ nextAppointment, nextAppointmentLoading }: Props) {
  const { profile } = useAuth();
  const [tip, setTip] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const db = createClient();
        const now = new Date();
        const in24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const [unread, pending] = await Promise.all([
          db
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .neq("status", "closed")
            .gt("unread_count", 0),
          db
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending")
            .gte("start_at", now.toISOString())
            .lte("start_at", in24.toISOString()),
        ]);
        const u = unread.count ?? 0;
        const p = pending.count ?? 0;
        const parts: string[] = [];
        if (u > 0) parts.push(`${u} conversación${u === 1 ? "" : "es"} sin responder`);
        if (p > 0) parts.push(`${p} cita${p === 1 ? "" : "s"} por confirmar`);
        setTip(
          parts.length
            ? `Tienes ${parts.join(" y ")}. ¿Te ayudo a resolverlas?`
            : "Todo al día. Pídeme un resumen del día cuando quieras.",
        );
      } catch {
        setTip("Pregúntame lo que necesites de tu clínica.");
      }
    })();
  }, []);

  const name = profile?.full_name?.trim();
  const title = profile?.title?.trim();
  const greeting = name ? `Hola, ${title ? `${title} ` : ""}${name}` : "Hola";

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

      {/* Recomendaciones de Zen incorporadas */}
      <div className="relative mt-5 flex flex-col gap-3 rounded-xl border border-white/15 bg-white/10 p-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-emerald-200">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-emerald-100/90">
              Recomendaciones de {COPILOT_NAME}
            </div>
            <div className="text-sm text-emerald-50">{tip ?? "Cargando…"}</div>
          </div>
        </div>
        <Link
          href="/copilot"
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-[#06210F] transition hover:brightness-105 sm:w-auto"
        >
          <Send className="size-4" /> Hablar con {COPILOT_NAME}
        </Link>
      </div>
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
