'use client';

import { useTranslations } from 'next-intl';

import { DoctorManager } from './doctor-manager';
import { RoomManager } from './room-manager';
import { ServiceTypeManager } from './service-type-manager';
import { SettingsPanelHead } from './settings-panel-head';

/**
 * "Scheduling" section — clinic resources (doctors, consultorios,
 * treatments) managed here; appointments themselves are created from
 * the pipeline (see DealAppointmentPanel). Cal.com / Google Calendar
 * connection cards land here in later phases.
 */
export function SchedulingPanel() {
  const t = useTranslations('Settings.scheduling');

  return (
    <section className="max-w-3xl animate-in fade-in-50 space-y-4 duration-200">
      <SettingsPanelHead title={t('title')} description={t('description')} />
      <DoctorManager />
      <RoomManager />
      <ServiceTypeManager />
    </section>
  );
}
