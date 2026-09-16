"use client";

// ============================================================
// SyncZohoCrmDialog — /admin/accounts button that backfills every
// existing account (trials in progress, expired trials, canceled
// subscriptions) into Zoho CRM as a Lead via POST
// /api/platform-admin/zoho-crm/backfill-leads. Opening the dialog
// runs a dry run automatically so the admin sees exactly what would
// happen before anything is written to the CRM — this hits Oswaldo's
// real Zoho org, so no silent bulk-create on click.
// ============================================================

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BackfillSummary {
  dryRun: boolean;
  totalAccounts: number;
  created: number;
  skippedExisting: number;
  skippedNoEmail: number;
  errors: { accountId: string; accountName: string | null; message: string }[];
  preview?: { accountId: string; accountName: string; ownerEmail: string; leadStatus: string; action: string }[];
}

async function runBackfill(dryRun: boolean): Promise<BackfillSummary> {
  const res = await fetch(`/api/platform-admin/zoho-crm/backfill-leads${dryRun ? "?dryRun=1" : ""}`, {
    method: "POST",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // A null body here means the response wasn't valid JSON — most
    // likely a reverse-proxy error page instead of the API's own
    // response (see the backfill route's comment on why it avoids
    // 502/503/504). Say so rather than a bare generic message, since
    // "revisa los logs del servidor" is a materially different next
    // step than "algo en Zoho falló".
    throw new Error(
      body?.error ?? `No se pudo sincronizar con Zoho CRM (HTTP ${res.status}, respuesta no reconocida — revisa los logs del servidor)`,
    );
  }
  return body as BackfillSummary;
}

export function SyncZohoCrmDialog() {
  const [open, setOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<BackfillSummary | null>(null);
  const [result, setResult] = useState<BackfillSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    setResult(null);
    setError(null);
    setLoadingPreview(true);
    try {
      setPreview(await runBackfill(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      const summary = await runBackfill(false);
      setResult(summary);
      if (summary.errors.length > 0) {
        toast.error(`${summary.created} leads creados, ${summary.errors.length} con error — revisa el detalle`);
      } else {
        toast.success(`${summary.created} leads nuevos en Zoho CRM (${summary.skippedExisting} ya existían)`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo sincronizar con Zoho CRM");
    } finally {
      setBusy(false);
    }
  }

  const toCreate = preview?.preview?.filter((p) => p.action === "se crearía") ?? [];
  const visible = toCreate.slice(0, 15);

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <RefreshCw className="h-3.5 w-3.5" />
        Sincronizar con Zoho CRM
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sincronizar cuentas con Zoho CRM</DialogTitle>
            <DialogDescription>
              Crea un Lead en Zoho CRM para cada cuenta que todavía no tiene uno — trials en curso,
              vencidos o cancelados incluidos. Las cuentas cuyo correo ya tiene un Lead se omiten, así
              que esto se puede correr más de una vez sin duplicar.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="space-y-3 py-2 text-sm">
              <p className="text-foreground">
                <strong>{result.created}</strong> leads creados · <strong>{result.skippedExisting}</strong> ya
                existían · <strong>{result.skippedNoEmail}</strong> sin correo de dueño resuelto.
              </p>
              {result.errors.length > 0 ? (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
                  {result.errors.map((e) => (
                    <div key={e.accountId}>
                      {e.accountName ?? e.accountId}: {e.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : error ? (
            <p className="py-4 text-sm text-destructive">{error}</p>
          ) : loadingPreview ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Revisando cuentas y buscando duplicados en Zoho CRM…
            </div>
          ) : preview ? (
            <div className="space-y-3 py-2 text-sm">
              <p className="text-foreground">
                Se crearían <strong>{toCreate.length}</strong> leads nuevos de{" "}
                {preview.totalAccounts} cuentas totales ({preview.skippedExisting} ya tienen Lead,{" "}
                {preview.skippedNoEmail} sin correo de dueño).
              </p>
              {toCreate.length > 0 ? (
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/30 p-2 text-xs">
                  {visible.map((p) => (
                    <div key={p.accountId} className="flex items-center justify-between gap-2">
                      <span className="truncate text-foreground">{p.accountName}</span>
                      <span className="shrink-0 text-muted-foreground">{p.leadStatus}</span>
                    </div>
                  ))}
                  {toCreate.length > visible.length ? (
                    <div className="text-muted-foreground">+{toCreate.length - visible.length} más</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {result ? "Cerrar" : "Cancelar"}
            </Button>
            {!result ? (
              <Button onClick={handleConfirm} disabled={busy || loadingPreview || !!error || toCreate.length === 0}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Crear {toCreate.length > 0 ? toCreate.length : ""} leads
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
