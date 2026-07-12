"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import type { Plan, SubscriptionStatus } from "@/lib/billing-platform/plans";

interface AdminAccount {
  id: string;
  name: string;
  ownerUserId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string;
  includedSeats: number;
  seatsUsed: number;
  portalClientId: string | null;
  createdAt: string;
}

const PLAN_LABEL: Record<Plan, string> = {
  trial: "Prueba",
  standalone: "Standalone",
  zentro_salud_starter: "Zentro Salud Starter",
  zentro_salud_pro: "Zentro Salud Pro",
};

const STATUS_VARIANT: Record<SubscriptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  trialing: "secondary",
  active: "default",
  past_due: "destructive",
  canceled: "outline",
  trial_expired: "destructive",
};

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "En prueba",
  active: "Activa",
  past_due: "Pago vencido",
  canceled: "Cancelada",
  trial_expired: "Prueba vencida",
};

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/platform-admin/accounts");
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "No se pudo cargar la lista de cuentas");
        if (!cancelled) setAccounts(body.accounts);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error desconocido");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Cuentas</h1>
        <p className="text-sm text-muted-foreground">
          Todas las cuentas de Zentro Med — plan, estado de suscripción y asientos.
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : !accounts ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando cuentas…
        </div>
      ) : accounts.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Todavía no hay cuentas registradas.
        </p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead>Dueño</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Asientos</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium text-foreground">{account.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-foreground">{account.ownerName ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {account.ownerEmail ?? "sin email resuelto"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{PLAN_LABEL[account.plan]}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[account.subscriptionStatus]}>
                      {STATUS_LABEL[account.subscriptionStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {account.seatsUsed} / {account.includedSeats}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(account.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <ImpersonateButton
                      accountId={account.id}
                      accountName={account.name}
                      ownerEmail={account.ownerEmail}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
