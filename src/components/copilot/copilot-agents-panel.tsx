"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Zap } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

interface Automation {
  id: string;
  name: string;
  is_active: boolean;
  execution_count: number;
  last_executed_at: string | null;
}

/** "Agentes activos" — automatizaciones reales (`is_active=true`) de
 *  la cuenta, no una lista ilustrativa. `execution_count` cuenta
 *  corridas del flujo, no mensajes de chat — el copy dice
 *  "ejecuciones", nunca "chats" (esa tabla no distingue mensajes
 *  individuales). formatRelative de trigger-meta.ts devuelve texto
 *  en inglés fijo ("2h ago"); este archivo (como el resto de
 *  copilot-chat.tsx) está en español hardcodeado, así que se usa un
 *  formateador local en vez de mezclar idiomas. */
export function CopilotAgentsPanel() {
  const [automations, setAutomations] = useState<Automation[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("automations")
      .select("id, name, is_active, execution_count, last_executed_at")
      .eq("is_active", true)
      .order("execution_count", { ascending: false })
      .limit(4)
      .then(({ data, error }) => {
        if (cancelled) return;
        setAutomations(error ? [] : ((data ?? []) as Automation[]));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <Bot className="size-4" />
          </span>
          Agentes activos
        </div>
        <Link href="/automations" className="text-xs font-medium text-primary hover:text-primary/80">
          Ver todas
        </Link>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : !automations || automations.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No tienes automatizaciones activas.{" "}
          <Link href="/automations" className="font-medium text-primary hover:text-primary/80">
            Crear una
          </Link>
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {automations.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                <Zap className="size-4 shrink-0 text-violet-500" />
                <span className="truncate">{a.name}</span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {a.execution_count === 0
                  ? "Sin ejecuciones aún"
                  : `${a.execution_count} ejecución${a.execution_count === 1 ? "" : "es"} · ${formatRelativeEs(a.last_executed_at)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatRelativeEs(iso: string | null): string {
  if (!iso) return "nunca ejecutada";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "nunca ejecutada";
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return "hace un momento";
  if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `hace ${Math.floor(diffSec / 3600)} h`;
  if (diffSec < 2_592_000) return `hace ${Math.floor(diffSec / 86400)} d`;
  return new Date(iso).toLocaleDateString("es-MX");
}
