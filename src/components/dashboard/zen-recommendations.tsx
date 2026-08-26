"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { COPILOT_NAME } from "@/lib/ai/copilot/branding";

/**
 * Tira de recomendaciones de Zen en el Panel: mira señales en vivo de la
 * cuenta (RLS-scoped) y sugiere acciones, con un CTA para abrir el chat.
 * Heurístico (sin costo de tokens); el chat es la puerta al análisis
 * profundo con IA.
 */
export function ZenRecommendations() {
  const [tips, setTips] = useState<string[]>([]);

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
        const t: string[] = [];
        if (u > 0) {
          t.push(
            `💬 Tienes ${u} conversación${u === 1 ? "" : "es"} sin responder — atiéndelas para no perder pacientes.`,
          );
        }
        if (p > 0) {
          t.push(
            `📅 ${p} cita${p === 1 ? "" : "s"} pendiente${p === 1 ? "" : "s"} de confirmar en las próximas 24 h.`,
          );
        }
        if (t.length === 0) {
          t.push("✅ Todo al día. Pídeme un resumen del día cuando quieras.");
        }
        setTips(t.slice(0, 3));
      } catch {
        setTips([]);
      }
    })();
  }, []);

  if (tips.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Recomendaciones de {COPILOT_NAME}</p>
          <ul className="mt-1 space-y-0.5">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Link
        href="/copilot"
        className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 sm:self-center"
      >
        <Send className="size-4" /> Hablar con {COPILOT_NAME}
      </Link>
    </div>
  );
}
