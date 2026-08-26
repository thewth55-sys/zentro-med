"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface CopilotProfileData {
  addressAs: string | null;
  specialty: string | null;
  tone: string | null;
  baseContext: string | null;
}

interface Props {
  mode: "onboarding" | "edit";
  initial: CopilotProfileData | null;
  onSaved: () => void;
  onCancel?: () => void;
}

const TONES = [
  { value: "cercano", label: "Cercano y cálido" },
  { value: "formal", label: "Formal y profesional" },
  { value: "breve", label: "Breve y directo" },
];

const inputClass =
  "w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none";

export function CopilotOnboarding({ mode, initial, onSaved, onCancel }: Props) {
  const [addressAs, setAddressAs] = useState(initial?.addressAs ?? "");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "");
  const [tone, setTone] = useState(initial?.tone ?? "cercano");
  const [baseContext, setBaseContext] = useState(initial?.baseContext ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/copilot/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressAs, specialty, tone, baseContext }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error ?? "No se pudo guardar.");
      }
      toast.success(
        mode === "onboarding" ? "¡Listo! Tu copiloto está configurado." : "Preferencias actualizadas",
      );
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl py-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {mode === "onboarding" ? "Configuremos tu copiloto" : "Preferencias del copiloto"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "onboarding"
              ? "Unas preguntas rápidas para que te entienda desde el primer día. Puedes cambiarlo cuando quieras."
              : "Ajusta cómo se dirige a ti y qué contexto tiene siempre presente."}
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">¿Cómo quieres que te llame?</label>
          <input
            value={addressAs}
            onChange={(e) => setAddressAs(e.target.value)}
            placeholder="Dr. López, Dra. Ana, por mi nombre…"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">¿Cuál es tu especialidad o giro?</label>
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Pediatría, odontología, veterinaria…"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">¿Qué tono prefieres?</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)} className={inputClass}>
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            ¿Algo que deba tener siempre presente? <span className="text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            value={baseContext}
            onChange={(e) => setBaseContext(e.target.value)}
            rows={3}
            placeholder="Ej. Solo atiendo por las tardes; manejo dos consultorios; prefiero confirmar por WhatsApp…"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "onboarding" ? "Empezar" : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
