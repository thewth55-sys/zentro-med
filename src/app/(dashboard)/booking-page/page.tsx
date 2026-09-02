'use client';

import { PlanGate } from '@/components/billing-platform/plan-gate';
import { PublicBookingSettings } from '@/components/settings/public-booking-settings';
import { BookingPageEditor } from '@/components/settings/booking-page-editor';
import { PaymentGatewayEditor } from '@/components/settings/payment-gateway-editor';

/**
 * Top-level page (not a Settings tab) so the personalización/anticipo
 * editors get the dashboard's full content width — same reasoning as
 * /landing before it. Replaces the old "Sitio web" nav item: activar/slug
 * (PublicBookingSettings) is free on every plan, so unlike /landing this
 * page has no single outer PlanGate — only the premium sections below are
 * individually gated.
 */
export default function BookingPagePage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Página de reserva</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu página pública para que los pacientes agenden en línea: actívala, personalízala y, si
          aplica, cobra un anticipo antes de confirmar la cita.
        </p>
      </div>
      <PublicBookingSettings />
      <PlanGate feature="booking_page" featureLabel="Página de reserva personalizada">
        <BookingPageEditor />
      </PlanGate>
      <PlanGate feature="payment_gateway" featureLabel="Pasarela de pago (anticipo)">
        <PaymentGatewayEditor />
      </PlanGate>
    </div>
  );
}
