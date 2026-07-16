"use client";

// ============================================================
// AccountDetailPanel — the "Cuenta 360" body for /admin/accounts/[id].
// Fetches /api/platform-admin/accounts/[id] and renders plan info,
// internal team members, and Stripe payment history, plus the same
// AccountActionsMenu used in the accounts table.
// ============================================================

import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, Loader2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AccountActionsMenu } from "@/components/admin/account-actions-menu";
import type { Plan, SubscriptionStatus } from "@/lib/billing-platform/plans";

interface AccountDetail {
  id: string;
  name: string;
  ownerUserId: string;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string;
  includedSeats: number;
  hasStripeCustomer: boolean;
  createdAt: string;
}

interface Member {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: string;
}

interface Payment {
  id: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  description: string | null;
  hostedInvoiceUrl: string | null;
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

const ROLE_LABEL: Record<string, string> = {
  owner: "Dueño",
  admin: "Administrador",
  member: "Miembro",
  viewer: "Solo lectura",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: "Pagado",
  open: "Pendiente",
  uncollectible: "Rechazado",
  void: "Anulado",
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}

export function AccountDetailPanel({ accountId }: { accountId: string }) {
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/platform-admin/accounts/${accountId}`, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "No se pudo cargar la cuenta");
      setAccount(body.account);
      setMembers(body.members);
      setPayments(body.payments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando cuenta…
      </div>
    );
  }

  const owner = members.find((m) => m.userId === account.ownerUserId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{account.name}</h1>
            <Badge variant={STATUS_VARIANT[account.subscriptionStatus]}>
              {STATUS_LABEL[account.subscriptionStatus]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {owner?.fullName ?? "Sin dueño resuelto"} · {owner?.email ?? "—"}
          </p>
        </div>
        <AccountActionsMenu
          accountId={account.id}
          accountName={account.name}
          ownerEmail={owner?.email ?? null}
          plan={account.plan}
          subscriptionStatus={account.subscriptionStatus}
          onChanged={load}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted p-4">
          <div className="text-xs text-muted-foreground">Plan</div>
          <div className="mt-1 text-sm font-medium text-foreground">{PLAN_LABEL[account.plan]}</div>
        </div>
        <div className="rounded-lg bg-muted p-4">
          <div className="text-xs text-muted-foreground">Asientos</div>
          <div className="mt-1 text-sm font-medium text-foreground">
            {members.length} / {account.includedSeats}
          </div>
        </div>
        <div className="rounded-lg bg-muted p-4">
          <div className="text-xs text-muted-foreground">Cliente desde</div>
          <div className="mt-1 text-sm font-medium text-foreground">
            {new Date(account.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <CreditCard className="size-4" /> Pagos recientes
          </div>
          {!account.hasStripeCustomer ? (
            <p className="text-sm text-muted-foreground">Sin cliente de Stripe asociado.</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay facturas.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(payment.created * 1000).toLocaleDateString()}
                  </span>
                  <a
                    href={payment.hostedInvoiceUrl ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={
                      payment.status === "paid"
                        ? "text-foreground hover:underline"
                        : "text-destructive hover:underline"
                    }
                  >
                    {PAYMENT_STATUS_LABEL[payment.status] ?? payment.status} —{" "}
                    {formatMoney(payment.status === "paid" ? payment.amountPaid : payment.amountDue, payment.currency)}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="size-4" /> Usuarios internos
          </div>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{member.fullName ?? member.email ?? "—"}</span>
                <span className="text-muted-foreground">{ROLE_LABEL[member.role] ?? member.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
