'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CreditCard, Loader2 } from 'lucide-react';

import { useCan } from '@/hooks/use-can';
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
  deposit_amount: number;
  currency: string;
  has_credentials: boolean;
}

/**
 * Editor de la pasarela de pago para el anticipo de reserva (Ajustes
 * → Agenda). Se monta detrás de PlanGate (payment_gateway,
 * Profesional+). A diferencia de BookingPageEditor, guarda vía API
 * (no Supabase directo) porque las credenciales necesitan cifrado en
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [storedProvider, setStoredProvider] = useState<PaymentProviderId | null>(null);

  const [provider, setProvider] = useState<PaymentProviderId>('stripe');
  const [isActive, setIsActive] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [currency, setCurrency] = useState('MXN');

  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [clipApiKey, setClipApiKey] = useState('');
  const [clipSecretKey, setClipSecretKey] = useState('');

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
        setDepositAmount(String(config.deposit_amount ?? ''));
        setCurrency(config.currency ?? 'MXN');
        setHasStoredCredentials(config.has_credentials);
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
      const amount = Number(depositAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        toast.error('El monto del anticipo debe ser un número válido.');
        return;
      }

      const credentials =
        provider === 'stripe'
          ? { secretKey: stripeSecretKey.trim(), webhookSecret: stripeWebhookSecret.trim() }
          : provider === 'mercadopago'
            ? { accessToken: mpAccessToken.trim() }
            : { apiKey: clipApiKey.trim(), secretKey: clipSecretKey.trim() };

      const res = await fetch('/api/payment-gateway/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, is_active: isActive, deposit_amount: amount, currency, credentials }),
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <CreditCard className="size-4 text-primary" />
          Pasarela de pago (anticipo)
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Cobra un anticipo al confirmar una reserva en línea. Cada cuenta trae su propia cuenta de
          Stripe, Mercado Pago o Clip — Zentro Med no procesa ni retiene el dinero.
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
                  <Label>Clave secreta (Secret key)</Label>
                  <Input
                    type="password"
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                    placeholder={keepsStoredCredentials ? '(sin cambios)' : 'sk_live_…'}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Firma del webhook (Signing secret)</Label>
                  <Input
                    type="password"
                    value={stripeWebhookSecret}
                    onChange={(e) => setStripeWebhookSecret(e.target.value)}
                    placeholder={keepsStoredCredentials ? '(sin cambios)' : 'whsec_…'}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}

            {provider === 'mercadopago' && (
              <div className="space-y-1.5">
                <Label>Access token</Label>
                <Input
                  type="password"
                  value={mpAccessToken}
                  onChange={(e) => setMpAccessToken(e.target.value)}
                  placeholder={keepsStoredCredentials ? '(sin cambios)' : 'APP_USR-…'}
                  disabled={disabled}
                />
              </div>
            )}

            {provider === 'clip' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Clave API</Label>
                  <Input
                    type="password"
                    value={clipApiKey}
                    onChange={(e) => setClipApiKey(e.target.value)}
                    placeholder={keepsStoredCredentials ? '(sin cambios)' : 'API key de Clip'}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Clave secreta</Label>
                  <Input
                    type="password"
                    value={clipSecretKey}
                    onChange={(e) => setClipSecretKey(e.target.value)}
                    placeholder={keepsStoredCredentials ? '(sin cambios)' : 'Secret key de Clip'}
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
                Ya hay credenciales guardadas para {PAYMENT_PROVIDER_LABEL[provider]}. Deja los campos en
                blanco para conservarlas, o llénalos para reemplazarlas.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Monto del anticipo</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  disabled={disabled}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                  disabled={disabled}
                  placeholder="MXN"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Cobrar anticipo al reservar</Label>
                <p className="text-xs text-muted-foreground">
                  Con esto activo, quien reserve en línea paga el anticipo antes de que la cita quede
                  confirmada.
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
  );
}
