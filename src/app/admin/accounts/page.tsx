"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountActionsMenu } from "@/components/admin/account-actions-menu";
import { CreateDemoAccountDialog } from "@/components/admin/create-demo-account-dialog";
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
  tags: { id: string; label: string }[];
  /** Most recent NON-impersonation login (see
   *  087_login_events_impersonation_flag.sql) — null if the account
   *  has never had a real login logged. */
  lastActiveAt: string | null;
}

/** Below this many days since the last real login, an account counts
 *  as "sin actividad reciente" for the activity filter/badge. */
const INACTIVE_THRESHOLD_DAYS = 30;

type ActivityFilter = "all" | "active" | "inactive";

function daysSince(dateIso: string): number {
  return (Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24);
}

function isRecentlyActive(lastActiveAt: string | null): boolean {
  return !!lastActiveAt && daysSince(lastActiveAt) <= INACTIVE_THRESHOLD_DAYS;
}

const PLAN_LABEL: Record<Plan, string> = {
  trial: "Prueba",
  esencial: "Esencial",
  profesional: "Profesional",
  clinica: "Clínica",
};

const STATUS_VARIANT: Record<SubscriptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  trialing: "secondary",
  active: "default",
  past_due: "destructive",
  canceled: "outline",
  trial_expired: "destructive",
  suspended: "destructive",
};

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "En prueba",
  active: "Activa",
  past_due: "Pago vencido",
  canceled: "Cancelada",
  trial_expired: "Prueba vencida",
  suspended: "Suspendida",
};

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  async function loadAccounts() {
    try {
      const res = await fetch("/api/platform-admin/accounts", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "No se pudo cargar la lista de cuentas");
      setAccounts(body.accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  const query = search.trim().toLowerCase();
  const filteredAccounts = accounts
    ?.filter((account) =>
      !query
        ? true
        : [account.name, account.ownerName, account.ownerEmail]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(query)),
    )
    .filter((account) => {
      if (activityFilter === "all") return true;
      const active = isRecentlyActive(account.lastActiveAt);
      return activityFilter === "active" ? active : !active;
    });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cuentas</h1>
          <p className="text-sm text-muted-foreground">
            Todas las cuentas de Zentro Med — plan, estado de suscripción y asientos.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Buscar por nombre, dueño o correo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={activityFilter} onValueChange={(v) => v && setActivityFilter(v as ActivityFilter)}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda actividad</SelectItem>
              <SelectItem value="active">Activas (últimos {INACTIVE_THRESHOLD_DAYS} días)</SelectItem>
              <SelectItem value="inactive">Sin actividad reciente</SelectItem>
            </SelectContent>
          </Select>
          <CreateDemoAccountDialog onCreated={loadAccounts} />
        </div>
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
      ) : filteredAccounts && filteredAccounts.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {search
            ? <>Ninguna cuenta coincide con &ldquo;{search}&rdquo;.</>
            : "Ninguna cuenta coincide con este filtro."}
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
                <TableHead>Etiquetas</TableHead>
                <TableHead>Última actividad</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(filteredAccounts ?? []).map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium text-foreground">
                    <Link href={`/admin/accounts/${account.id}`} className="hover:underline">
                      {account.name}
                    </Link>
                  </TableCell>
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
                  <TableCell>
                    {account.tags.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {account.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.lastActiveAt ? (
                      <span
                        className={
                          isRecentlyActive(account.lastActiveAt) ? "text-foreground" : "text-muted-foreground"
                        }
                      >
                        {new Date(account.lastActiveAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Sin actividad
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(account.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <AccountActionsMenu
                      accountId={account.id}
                      accountName={account.name}
                      ownerEmail={account.ownerEmail}
                      plan={account.plan}
                      subscriptionStatus={account.subscriptionStatus}
                      onChanged={loadAccounts}
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
