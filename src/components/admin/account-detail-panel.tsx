"use client";

// ============================================================
// AccountDetailPanel — the "Cuenta 360" body for /admin/accounts/[id].
// Fetches /api/platform-admin/accounts/[id] and renders plan info,
// internal team members, and Stripe payment history, plus the same
// AccountActionsMenu used in the accounts table.
// ============================================================

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bot,
  CreditCard,
  Laptop,
  Lock,
  Loader2,
  Notebook,
  Plug,
  Plus,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountActionsMenu } from "@/components/admin/account-actions-menu";
import type { Plan, SubscriptionStatus } from "@/lib/billing-platform/plans";
import {
  GATED_FEATURES,
  FEATURE_LABEL,
  resolveFeatureAccess,
  type FeatureOverrides,
} from "@/lib/billing-platform/features";

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
  featureOverrides: FeatureOverrides;
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

interface Integrations {
  ai: { provider: string; model: string; isActive: boolean; autoReplyEnabled: boolean } | null;
  whatsapp: { memberName: string; status: string; connectedAt: string | null }[];
  googleCalendar: string[];
}

interface Session {
  memberName: string;
  ipAddress: string | null;
  browser: string | null;
  device: string | null;
  country: string | null;
  createdAt: string;
}

interface Tag {
  id: string;
  label: string;
}

interface Note {
  id: string;
  body: string;
  authorName: string | null;
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
  const [tags, setTags] = useState<Tag[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [savingFeature, setSavingFeature] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/platform-admin/accounts/${accountId}`, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "No se pudo cargar la cuenta");
      setAccount(body.account);
      setMembers(body.members);
      setPayments(body.payments);
      setTags(body.tags ?? []);
      setNotes(body.notes ?? []);
      setIntegrations(body.integrations ?? null);
      setSessions(body.sessions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  async function handleAddTag() {
    const label = newTag.trim();
    if (!label) return;
    setAddingTag(true);
    try {
      const res = await fetch(`/api/platform-admin/accounts/${accountId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "No se pudo agregar la etiqueta");
      setTags((prev) => [...prev, body.tag]);
      setNewTag("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo agregar la etiqueta");
    } finally {
      setAddingTag(false);
    }
  }

  async function handleRemoveTag(tagId: string) {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    try {
      const res = await fetch(`/api/platform-admin/accounts/${accountId}/tags/${tagId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudo quitar la etiqueta");
      void load();
    }
  }

  async function handleAddNote() {
    const text = newNote.trim();
    if (!text) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/platform-admin/accounts/${accountId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "No se pudo agregar la nota");
      setNotes((prev) => [body.note, ...prev]);
      setNewNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo agregar la nota");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleSetFeatureOverride(feature: string, enabled: boolean | null) {
    setSavingFeature(feature);
    try {
      const res = await fetch(`/api/platform-admin/accounts/${accountId}/feature-overrides`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, enabled }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "No se pudo actualizar");
      setAccount((prev) => (prev ? { ...prev, featureOverrides: body.featureOverrides } : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setSavingFeature(null);
    }
  }

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
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
              >
                {tag.label}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  aria-label={`Quitar etiqueta ${tag.label}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="+ Etiqueta"
              disabled={addingTag}
              className="h-6 w-28 rounded-full border-dashed px-2.5 text-xs"
            />
          </div>
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

      <div className="rounded-lg border border-border p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Plug className="size-4" /> Integraciones
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-foreground">
              <Bot className="size-3.5 text-muted-foreground" /> Agentes IA
            </span>
            {integrations?.ai ? (
              <span className="text-muted-foreground">
                {integrations.ai.provider} · {integrations.ai.model} ·{" "}
                {integrations.ai.isActive ? "Activo" : "Inactivo"}
              </span>
            ) : (
              <span className="text-muted-foreground">Sin configurar</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-foreground">WhatsApp Business</span>
            {integrations?.whatsapp.length ? (
              <span className="text-muted-foreground">
                {integrations.whatsapp
                  .map((w) => `${w.memberName} (${w.status === "connected" ? "conectado" : "desconectado"})`)
                  .join(", ")}
              </span>
            ) : (
              <span className="text-muted-foreground">Sin configurar</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-foreground">Google Calendar</span>
            {integrations?.googleCalendar.length ? (
              <span className="text-muted-foreground">{integrations.googleCalendar.join(", ")}</span>
            ) : (
              <span className="text-muted-foreground">Sin conectar</span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Laptop className="size-4" /> Sesiones recientes
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin inicios de sesión registrados todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-normal">Usuario</th>
                  <th className="pb-2 pr-4 font-normal">Fecha</th>
                  <th className="pb-2 pr-4 font-normal">IP</th>
                  <th className="pb-2 pr-4 font-normal">País</th>
                  <th className="pb-2 pr-4 font-normal">Navegador</th>
                  <th className="pb-2 font-normal">Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pr-4 text-foreground">{s.memberName}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{s.ipAddress ?? "—"}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{s.country ?? "—"}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{s.browser ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">{s.device ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Lock className="size-4" /> Funciones de la cuenta
        </div>
        <div className="space-y-2 text-sm">
          {GATED_FEATURES.map((feature) => {
            const isOverridden = account.featureOverrides[feature] !== undefined;
            const effective = resolveFeatureAccess(account.plan, feature, account.featureOverrides);
            const saving = savingFeature === feature;
            return (
              <div key={feature} className="flex items-center justify-between">
                <span className="text-foreground">{FEATURE_LABEL[feature]}</span>
                <div className="flex items-center gap-2">
                  {isOverridden && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                      onClick={() => handleSetFeatureOverride(feature, null)}
                      disabled={saving}
                    >
                      Usar el del plan
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSetFeatureOverride(feature, !effective)}
                    disabled={saving}
                    className={
                      "rounded-full px-2.5 py-0.5 text-xs " +
                      (effective
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300")
                    }
                  >
                    {saving ? "…" : effective ? "Activo" : "Bloqueado"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Un bloqueo aquí anula el plan, pero solo oculta la función en la interfaz — no bloquea llamadas
          directas a la API todavía.
        </p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Notebook className="size-4" /> Notas internas
        </div>
        <div className="mb-4 flex gap-2">
          <Input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
            placeholder="Agregar una nota sobre esta cuenta"
            disabled={addingNote}
          />
          <Button onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
            {addingNote ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Agregar
          </Button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay notas.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{note.authorName ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-0.5 text-muted-foreground">{note.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
