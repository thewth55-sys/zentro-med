'use client';

import { useTranslations } from 'next-intl';

import { PlanGate } from '@/components/billing-platform/plan-gate';
import { DoctorManager } from './doctor-manager';
import { RoomManager } from './room-manager';
import { ServiceTypeManager } from './service-type-manager';
import { BusinessHoursManager } from './business-hours-manager';
import { SettingsPanelHead } from './settings-panel-head';

/**
 * "Scheduling" section — clinic resources (doctors, consultorios,
 * treatments) managed here; appointments themselves are created from
 * the pipeline (see DealAppointmentPanel). Cal.com connection card
 * lands here once that integration is wired up on the settings side
 * (webhook receiver exists — see api/integrations/cal-com/webhook).
 *
 * The public booking page itself (activar/slug, personalización,
 * anticipo) lives at its own top-level route, /booking-page — moved out
 * of this tab so it gets its own sidebar entry instead of being buried
 * under Ajustes → Agenda.
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
    </section>
  );
}
