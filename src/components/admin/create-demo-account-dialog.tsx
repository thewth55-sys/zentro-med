"use client";

// ============================================================
// CreateDemoAccountDialog — /admin/accounts button that spins up a
// fully-seeded demo account (contacts, WhatsApp-style conversations,
// patient profiles, agenda — see lib/admin/demo-seed.ts) via POST
// /api/platform-admin/accounts/demo. No email is invited; the admin
// accesses the new account afterward through the existing
// "Impersonar" action on its row.
// ============================================================

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Plan } from "@/lib/billing-platform/plans";

const PLAN_OPTIONS: { value: Plan; label: string }[] = [
  { value: "esencial", label: "Esencial" },
  { value: "profesional", label: "Profesional" },
  { value: "clinica", label: "Clínica (muestra todo)" },
];

interface CreateDemoAccountDialogProps {
  onCreated: () => void;
}

export function CreateDemoAccountDialog({ onCreated }: CreateDemoAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<Plan>("clinica");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Ponle un nombre a la cuenta demo");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/platform-admin/accounts/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, plan }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "No se pudo crear la cuenta demo");
      toast.success(`Cuenta demo "${trimmed}" creada — úsala con "Impersonar" en su fila`);
      setOpen(false);
      setName("");
      setPlan("clinica");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la cuenta demo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" />
        Crear cuenta demo
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear cuenta demo</DialogTitle>
            <DialogDescription>
              Crea una cuenta ya cargada con contactos, conversaciones de WhatsApp, fichas de
              paciente y una agenda de ejemplo — lista para mostrar en vivo con
              &ldquo;Impersonar&rdquo;. No se invita ningún correo real.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Nombre de la cuenta</label>
              <Input
                placeholder="Ej: Demo — Consultorio Dr. Martínez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Plan a mostrar</label>
              <Select value={plan} onValueChange={(v) => v && setPlan(v as Plan)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
