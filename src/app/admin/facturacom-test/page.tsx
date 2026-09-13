"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TestResult {
  ok: boolean;
  status: number;
  facturaResponse: {
    message?: string;
    UUID?: string;
    SAT?: { FechaTimbrado?: string };
    INV?: { Serie?: string; Folio?: number };
  } | null;
}

/**
 * Prueba de conectividad con el sandbox de factura.com (CFDI) — sin
 * validez fiscal, sin tocar ninguna cuenta/contacto/factura real. Solo
 * arma un CFDI de ejemplo (receptor "público en general") y lo manda a
 * https://sandbox.factura.com para confirmar que las credenciales y el
 * mapeo de campos funcionan, antes de diseñar la integración real.
 */
export default function FacturaComTestPage() {
  const [descripcion, setDescripcion] = useState("Consulta general");
  const [cantidad, setCantidad] = useState("1");
  const [valorUnitario, setValorUnitario] = useState("500");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  async function handleTest() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/platform-admin/facturacom/test-cfdi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcion: descripcion.trim() || undefined,
          cantidad: Number(cantidad) || undefined,
          valorUnitario: Number(valorUnitario) || undefined,
        }),
      });
      const body = (await res.json().catch(() => null)) as TestResult | null;
      if (!body) {
        toast.error("Respuesta inválida del servidor");
        return;
      }
      setResult(body);
      if (body.ok) {
        toast.success("CFDI de prueba timbrado ✔");
      } else {
        toast.error(body.facturaResponse?.message || `HTTP ${body.status}`);
      }
    } catch {
      toast.error("No se pudo contactar al sandbox de factura.com");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <FileText className="size-5 text-primary" /> Prueba de sandbox — factura.com
        </h1>
        <p className="text-sm text-muted-foreground">
          Solo sandbox (sin validez fiscal). Receptor fijo &quot;público en general&quot;
          (RFC XAXX010101000) — no involucra ninguna cuenta, contacto ni factura real.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Descripción</Label>
            <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Cantidad</Label>
            <Input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Precio unitario</Label>
            <Input type="number" min={0} step="0.01" value={valorUnitario} onChange={(e) => setValorUnitario(e.target.value)} className="h-9" />
          </div>
        </div>
        <Button onClick={handleTest} disabled={sending} className="w-full sm:w-auto">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Probar CFDI de prueba
        </Button>
      </div>

      {result && (
        <div className="mt-4 space-y-3">
          {result.ok ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
              <p className="font-medium text-emerald-600 dark:text-emerald-400">Timbrado exitoso (sandbox)</p>
              <dl className="mt-2 space-y-1 text-foreground">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">UUID:</dt>
                  <dd className="font-mono">{result.facturaResponse?.UUID ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Fecha timbrado:</dt>
                  <dd>{result.facturaResponse?.SAT?.FechaTimbrado ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Serie / Folio:</dt>
                  <dd>
                    {result.facturaResponse?.INV?.Serie ?? "—"} / {result.facturaResponse?.INV?.Folio ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
              <p className="font-medium text-destructive">
                Error ({result.status}): {result.facturaResponse?.message ?? "sin mensaje"}
              </p>
            </div>
          )}
          <details className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <summary className="cursor-pointer text-muted-foreground">Ver respuesta cruda</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(result.facturaResponse, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
