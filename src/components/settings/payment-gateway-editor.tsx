'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Copy, CreditCard, Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-can';
import { PlanGate } from '@/components/billing-platform/plan-gate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PAYMENT_PROVIDERS, PAYMENT_PROVIDER_LABEL, type PaymentProviderId } from '@/lib/payments/types';

interface ConfigResponse {
  provider: PaymentProviderId;
  is_active: boolean;
  has_credentials: boolean;
  /** Últimos 4 caracteres de cada campo, ej. `{ secretKey: "•••• a1b2" }` — nunca el valor completo. */
  credentials_preview: Record<string, string>;
}

/** Badge de confirmación junto a un campo ya guardado — reemplaza la
 *  ambigüedad de un placeholder genérico por algo positivo y, cuando
 *  hay preview, el dato real que confirma cuál credencial está activa. */
function StoredBadge({ preview }: { preview: string | undefined }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="size-3.5" />
      {preview ? `Configurada (${preview})` : 'Configurada'}
    </span>
  );
}

/**
 * Editor de la pasarela de pago (Ajustes → Pasarela de pago) —
 * configuración de cuenta, no específica de la reserva. Una vez
 * activa aquí, la misma pasarela se usa tanto para el anticipo de
 * reservas (monto configurado por separado en Página de reserva) como
 * para el cobro de facturas (checkout-link). Guarda vía API (no
 * Supabase directo) porque las credenciales necesitan cifrado en
 * servidor — ver /api/payment-gateway/config.
 *
 * Los campos de credenciales SIEMPRE empiezan vacíos, incluso si ya
 * hay unas guardadas — nunca se precargan enmascaradas. El servidor
 * solo reemplaza el campo que de verdad se llenó y conserva el resto
 * (ver la ruta), así que dejar un campo en blanco simplemente lo deja
 * como estaba. Esto evita el riesgo de reenviar por accidente un
 * placeholder de máscara como si fuera una credencial real.
 */
export function PaymentGatewayEditor() {
  const canEdit = useCan('edit-settings');
  const { accountId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [storedProvider, setStoredProvider] = useState<PaymentProviderId | null>(null);
  const [credentialsPreview, setCredentialsPreview] = useState<Record<string, string>>({});

  const [provider, setProvider] = useState<PaymentProviderId>('stripe');
  const [isActive, setIsActive] = useState(false);

  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [clipApiKey, setClipApiKey] = useState('');
  const [clipSecretKey, setClipSecretKey] = useState('');

  // Guarded the same way whatsapp-config.tsx already does — `window`
  // doesn't exist during the server render pass, only after hydration.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  function webhookUrlFor(p: PaymentProviderId, accId: string): string {
    return origin ? `${origin}/api/webhooks/payments/${p}/${accId}` : '';
  }

  function copyWebhookUrl(p: PaymentProviderId, accId: string) {
    const url = webhookUrlFor(p, accId);
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success('URL de webhook copiada');
  }

  function resetCredentialFields() {
    setStripeSecretKey('');
    setStripeWebhookSecret('');
    setMpAccessToken('');
    setClipApiKey('');
    setClipSecretKey('');
  }

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/payment-gateway/config');
      const payload = await res.json();
      const config: ConfigResponse | null = payload.config ?? null;
      if (config) {
        setProvider(config.provider);
        setStoredProvider(config.provider);
        setIsActive(config.is_active);
        setHasStoredCredentials(config.has_credentials);
        setCredentialsPreview(config.credentials_preview ?? {});
      } else {
        setCredentialsPreview({});
      }
      resetCredentialFields();
    } catch (err) {
      console.error('fetchConfig error:', err);
      toast.error('No se pudo cargar la configuración.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleProviderChange(next: PaymentProviderId) {
    setProvider(next);
    resetCredentialFields();
  }

  // Cambiar de proveedor descarta las credenciales guardadas del
  // anterior — hay que capturar todo de nuevo, no tiene sentido
  // "conservar" un access_token de Mercado Pago como si fuera una
  // clave de Stripe.
  const keepsStoredCredentials = hasStoredCredentials && provider === storedProvider;

  async function handleSave() {
    try {
      setSaving(true);
      const credentials =
        provider === 'stripe'
          ? { secretKey: stripeSecretKey.trim(), webhookSecret: stripeWebhookSecret.trim() }
          : provider === 'mercadopago'
            ? { accessToken: mpAccessToken.trim() }
            : { apiKey: clipApiKey.trim(), secretKey: clipSecretKey.trim() };

      const res = await fetch('/api/payment-gateway/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          is_active: isActive,
          credentials,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'No se pudo guardar la configuración.');
        return;
      }
      toast.success('Pasarela de pago guardada.');
      await fetchConfig();
    } catch (err) {
      console.error('Save payment gateway error:', err);
      toast.error('No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  const disabled = !canEdit || saving;

  return (
    <PlanGate feature="payment_gateway" featureLabel="Pasarela de pago">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <CreditCard className="size-4 text-primary" />
          Pasarela de pago
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Configuración general de cobros para toda la cuenta — se usa tanto para el anticipo de
          reservas (el monto se define en Página de reserva) como para cobrar facturas. Cada cuenta
          trae su propia cuenta de Stripe, Mercado Pago o Clip — Zentro Med no procesa ni retiene el
          dinero.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as PaymentProviderId)}
                disabled={disabled}
                className="h-10 w-full rounded-md border border-border bg-muted px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
              >
                {PAYMENT_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {PAYMENT_PROVIDER_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>

            {provider === 'stripe' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Clave secreta (Secret key)</Label>
                    {keepsStoredCredentials && <StoredBadge preview={credentialsPreview.secretKey} />}
                  </div>
                  <Input
                    type="password"
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                    placeholder={keepsStoredCredentials ? 'Dejar en blanco para conservarla' : 'sk_live_…'}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Firma del webhook (Signing secret)</Label>
                    {keepsStoredCredentials && <StoredBadge preview={credentialsPreview.webhookSecret} />}
                  </div>
                  <Input
                    type="password"
                    value={stripeWebhookSecret}
                    onChange={(e) => setStripeWebhookSecret(e.target.value)}
                    placeholder={keepsStoredCredentials ? 'Dejar en blanco para conservarla' : 'whsec_…'}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}

            {provider === 'mercadopago' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Access token</Label>
                  {keepsStoredCredentials && <StoredBadge preview={credentialsPreview.accessToken} />}
                </div>
                <Input
                  type="password"
                  value={mpAccessToken}
                  onChange={(e) => setMpAccessToken(e.target.value)}
                  placeholder={keepsStoredCredentials ? 'Dejar en blanco para conservarlo' : 'APP_USR-…'}
                  disabled={disabled}
                />
              </div>
            )}

            {provider === 'clip' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Clave API</Label>
                    {keepsStoredCredentials && <StoredBadge preview={credentialsPreview.apiKey} />}
                  </div>
                  <Input
                    type="password"
                    value={clipApiKey}
                    onChange={(e) => setClipApiKey(e.target.value)}
                    placeholder={keepsStoredCredentials ? 'Dejar en blanco para conservarla' : 'API key de Clip'}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Clave secreta</Label>
                    {keepsStoredCredentials && <StoredBadge preview={credentialsPreview.secretKey} />}
                  </div>
                  <Input
                    type="password"
                    value={clipSecretKey}
                    onChange={(e) => setClipSecretKey(e.target.value)}
                    placeholder={keepsStoredCredentials ? 'Dejar en blanco para conservarla' : 'Secret key de Clip'}
                    disabled={disabled}
                  />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Ambas están en tu Developer Dashboard de Clip — la clave secreta solo se puede ver una
                  vez al crearla, guárdala en cuanto la generes.
                </p>
              </div>
            )}

            {keepsStoredCredentials && (
              <p className="text-xs text-muted-foreground">
                Deja los campos en blanco para conservar las credenciales guardadas de{' '}
                {PAYMENT_PROVIDER_LABEL[provider]}, o llénalos para reemplazarlas.
              </p>
            )}

            {accountId && (
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                <Label>URL de webhook</Label>
                <p className="text-xs text-muted-foreground">
                  Pégala en el dashboard de desarrollador de {PAYMENT_PROVIDER_LABEL[provider]}, en la
                  configuración de webhooks — sin esto, un pago puede cobrarse correctamente y Zentro Med
                  nunca enterarse.
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookUrlFor(provider, accountId)}
                    className="font-mono text-xs"
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyWebhookUrl(provider, accountId)}
                    title="Copiar"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Pasarela de pago activa</Label>
                <p className="text-xs text-muted-foreground">
                  Con esto activo, la cuenta puede cobrar tanto anticipos de reserva como facturas con
                  esta pasarela. Desactívalo para dejar de aceptar cobros sin borrar tus credenciales.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} disabled={disabled} />
            </div>
          </>
        )}
      </CardContent>
      <CardContent className="pt-0">
        <Button onClick={handleSave} disabled={disabled || loading}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Guardar
        </Button>
      </CardContent>
    </Card>
    </PlanGate>
  );
}
