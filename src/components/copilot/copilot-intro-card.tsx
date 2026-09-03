import { CalendarClock, MessageSquareText, Plus, Sparkles, TrendingUp, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { COPILOT_NAME } from "@/lib/ai/copilot/branding";

interface Props {
  showReset: boolean;
  onReset: () => void;
  onEditPreferences: () => void;
}

const CAPABILITIES = [
  { icon: CalendarClock, label: "Lee tu agenda" },
  { icon: MessageSquareText, label: "Redacta mensajes" },
  { icon: TrendingUp, label: "Analiza tus números" },
  { icon: Sparkles, label: "Propone horarios" },
];

/** Tarjeta intro de Zen — mismo lenguaje visual que el hero del
 *  dashboard (gradient verde oscuro). Reemplaza el `<header>` plano
 *  que tenía antes copilot-chat.tsx; las 4 pills reflejan lo que Zen
 *  ya hace hoy (consultar agenda, redactar/enviar WhatsApp, analizar
 *  pacientes y negocios, proponer citas), solo relabeled — no son
 *  capacidades nuevas. */
export function CopilotIntroCard({ showReset, onReset, onEditPreferences }: Props) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-md"
      style={{ background: "linear-gradient(120deg, #0F241A, #164A31)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(74,222,90,.35), transparent 70%)" }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Sparkles className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">{COPILOT_NAME}</h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                En línea
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/80">
                BETA
              </span>
            </div>
            <p className="mt-0.5 text-sm text-emerald-100/80">Conoce tu agenda, tus pacientes y tus números</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {showReset && (
            <Button
              type="button"
              size="sm"
              onClick={onReset}
              className="border border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <Plus className="size-3.5" /> Nueva
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            onClick={onEditPreferences}
            title="Preferencias del copiloto"
            aria-label="Preferencias del copiloto"
            className="border border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        {CAPABILITIES.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90"
          >
            <Icon className="size-3.5" />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
