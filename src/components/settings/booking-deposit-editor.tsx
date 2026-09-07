'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Coins, Loader2 } from 'lucide-react';

import { useCan } from '@/hooks/use-can';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ConfigResponse {
  deposit_amount: number;
  currency: string;
  booking_terms: string | null;
  has_credentials: boolean;
}

/**
 * Monto del anticipo de reserva (Página de reserva) — separado de la
 * configuración de la pasarela de pago en sí (Ajustes → Pasarela de
 * pago, payment-gateway-editor.tsx), que ahora es una config de cuenta
 * compartida con el cobro de facturas. Este componente solo toca
 * deposit_amount/currency/booking_terms; provider/credentials/is_active
 * viven exclusivamente del lado de Ajustes — ver /api/payment-gateway/config,
 * que acepta cualquiera de los dos subconjuntos de campos por separado.
 *
 * Requiere que ya exista una pasarela configurada (provider +
 * credenciales no son NULL en la fila — no puede haber un anticipo sin
 * una pasarela real para cobrarlo), así que se deshabilita con un aviso
 * si todavía no se ha configurado nada en Ajustes.
 */
export function BookingDepositEditor() {
  const canEdit = useCan('edit-settings');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gatewayConfigured, setGatewayConfigured] = useState(false);

  const [depositAmount, setDepositAmount] = useState('');
  const [currency, setCurrency] = useState('MXN');
  const [bookingTerms, setBookingTerms] = useState('');

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/payment-gateway/config');
      const payload = await res.json();
      const config: ConfigResponse | null = payload.config ?? null;
      if (config) {
        setDepositAmount(String(config.deposit_amount ?? ''));
        setCurrency(config.currency ?? 'MXN');
        setBookingTerms(config.booking_terms ?? '');
        setGatewayConfigured(config.has_credentials);
      } else {
        setGatewayConfigured(false);
      }
    } catch (err) {
      console.error('fetchConfig error:', err);
      toast.error('No se pudo cargar la configuración.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchConfig();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      const amount = Number(depositAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        toast.error('El monto del anticipo debe ser un número válido.');
        return;
      }

      const res = await fetch('/api/payment-gateway/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deposit_amount: amount,
          currency,
          booking_terms: bookingTerms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'No se pudo guardar la configuración.');
        return;
      }
      toast.success('Anticipo guardado.');
      await fetchConfig();
    } catch (err) {
      console.error('Save deposit config error:', err);
      toast.error('No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  const disabled = !canEdit || saving || !gatewayConfigured;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Coins className="size-4 text-primary" />
          Anticipo de reserva
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Cobra un anticipo al confirmar una reserva en línea, usando la pasarela de pago configurada
          en Ajustes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {!gatewayConfigured && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Primero configura tu pasarela de pago en{' '}
                  <a href="/settings?tab=payment-gateway" className="font-medium underline underline-offset-2">
                    Ajustes → Pasarela de pago
                  </a>{' '}
                  antes de definir un anticipo.
                </span>
              </div>
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

            <div className="space-y-1.5">
              <Label>Términos de la reserva (opcional)</Label>
              <Textarea
                value={bookingTerms}
                onChange={(e) => setBookingTerms(e.target.value)}
                disabled={disabled}
                rows={5}
                placeholder="Ej. El anticipo no es reembolsable si cancelas con menos de 24 horas de anticipación…"
              />
              <p className="text-xs text-muted-foreground">
                Se muestra al paciente en la página de reserva, antes de que pague el anticipo. Redacta tus
                propias políticas de cancelación y reembolso — Zentro Med solo las guarda y las muestra.
              </p>
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
