'use client';

import { useTranslations } from 'next-intl';

import { PlanGate } from '@/components/billing-platform/plan-gate';
import { DoctorManager } from './doctor-manager';
import { RoomManager } from './room-manager';
import { ServiceTypeManager } from './service-type-manager';
import { PublicBookingSettings } from './public-booking-settings';
import { BusinessHoursManager } from './business-hours-manager';
import { BookingPageEditor } from './booking-page-editor';
import { PaymentGatewayEditor } from './payment-gateway-editor';
import { SettingsPanelHead } from './settings-panel-head';

/**
 * "Scheduling" section — clinic resources (doctors, consultorios,
 * treatments) managed here; appointments themselves are created from
 * the pipeline (see DealAppointmentPanel). Cal.com connection card
 * lands here once that integration is wired up on the settings side
 * (webhook receiver exists — see api/integrations/cal-com/webhook).
 */
export function SchedulingPanel() {
  const t = useTranslations('Settings.scheduling');

  return (
    <section className="max-w-3xl animate-in fade-in-50 space-y-4 duration-200">
      <SettingsPanelHead title={t('title')} description={t('description')} />
      <DoctorManager />
      <RoomManager />
      <ServiceTypeManager />
      <PlanGate feature="clinic_hours" featureLabel="Horarios por consultorio">
        <BusinessHoursManager />
      </PlanGate>
      <PublicBookingSettings />
      <PlanGate feature="booking_page" featureLabel="Página de reserva personalizada">
        <BookingPageEditor />
      </PlanGate>
      <PlanGate feature="payment_gateway" featureLabel="Pasarela de pago (anticipo)">
        <PaymentGatewayEditor />
      </PlanGate>
    </section>
  );
}
