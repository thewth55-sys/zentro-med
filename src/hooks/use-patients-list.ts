'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import type { Contact } from '@/types';

/** Una cita "reciente" para efectos de este listado — ver ACTIVITY_WINDOW_DAYS. */
interface AppointmentSummary {
  contact_id: string | null;
  start_at: string;
  status: string;
  service_type: { name: string } | null;
}

interface InvoiceSummary {
  contact_id: string;
  status: string;
  total: number | string;
  amount_paid: number | string;
}

export interface PatientRow {
  contact: Contact;
  /** null si el paciente no tiene `patient_profiles.birth_date` capturada. */
  age: number | null;
  /** `patient_profiles.patient_group` — texto libre, puede no estar poblado. */
  patientGroup: string | null;
  nextAppointment: { startAt: string; serviceTypeName: string | null } | null;
  /** Tratamiento a mostrar: el de la próxima cita si existe, si no el de la
   *  última cita dentro de la ventana de actividad. null si no hay ninguna. */
  treatmentLabel: string | null;
  /** Suma de facturas no draft/void: total - amount_paid. */
  balance: number;
  /** Alguna factura que compone el saldo está en estado `overdue`. */
  hasOverdue: boolean;
  /** Tuvo alguna cita (no cancelada) dentro de los últimos
   *  ACTIVITY_WINDOW_DAYS días, o tiene una próxima cita agendada. */
  isActive: boolean;
}

// No hay un campo real de "paciente activo/inactivo" en el esquema — se
// infiere de la actividad de citas reciente. Documentado y confirmado con
// el usuario (no es un dato fabricado, es una regla de negocio explícita).
const ACTIVITY_WINDOW_DAYS = 180;

function computeAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

/**
 * Carga todos los pacientes (contactos con `patient_profiles`) de la cuenta
 * junto con su próxima cita, tratamiento y saldo pendiente — usando el mismo
 * patrón "un solo fetch, agrupar por contact_id en el cliente" que ya usa
 * usePatientsWithoutNextAppointment, en vez de una petición por paciente.
 */
export function usePatientsList(search: string) {
  const supabase = createClient();
  const [rows, setRows] = useState<PatientRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchSeq = useRef(0);

  const reload = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);

    // Left embed (sin `!inner`) a propósito: un contacto pasa a tener fila en
    // `patient_profiles` solo con una conversión manual desde la ficha
    // (Médico → "Crear perfil de paciente"), gateada por el límite de
    // pacientes del plan — ver medical-tab.tsx. Si este listado exigiera
    // esa fila, "+ Agregar paciente" crearía contactos invisibles en su
    // propia lista hasta convertirlos a mano. age/patientGroup quedan en
    // null (mostrados como ausentes) para quien aún no la tenga.
    let query = supabase
      .from('contacts')
      .select('*, patient_profiles(birth_date, patient_group)')
      .order('created_at', { ascending: false });

    const term = search.trim();
    if (term) {
      const like = `%${term}%`;
      query = query.or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`);
    }

    const { data: contactRows, error } = await query;
    if (seq !== fetchSeq.current) return;
    if (error || !contactRows) {
      setRows([]);
      setLoading(false);
      return;
    }

    const windowStart = new Date(
      Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [apptRes, invRes] = await Promise.all([
      fetch(`/api/appointments?from=${encodeURIComponent(windowStart)}`),
      fetch('/api/billing/invoices'),
    ]);
    if (seq !== fetchSeq.current) return;

    const apptJson = await apptRes.json().catch(() => ({}));
    const invJson = await invRes.json().catch(() => ({}));
    if (seq !== fetchSeq.current) return;

    const appointments = (apptJson.appointments ?? []) as AppointmentSummary[];
    const invoices = (invJson.invoices ?? []) as InvoiceSummary[];

    const now = Date.now();
    const nextByContact = new Map<string, AppointmentSummary>();
    const lastByContact = new Map<string, AppointmentSummary>();
    const activeContacts = new Set<string>();

    for (const a of appointments) {
      if (!a.contact_id || a.status === 'cancelled') continue;
      activeContacts.add(a.contact_id);
      const startMs = new Date(a.start_at).getTime();
      if (startMs >= now) {
        const current = nextByContact.get(a.contact_id);
        if (!current || startMs < new Date(current.start_at).getTime()) {
          nextByContact.set(a.contact_id, a);
        }
      } else {
        const current = lastByContact.get(a.contact_id);
        if (!current || startMs > new Date(current.start_at).getTime()) {
          lastByContact.set(a.contact_id, a);
        }
      }
    }

    const balanceByContact = new Map<string, number>();
    const overdueByContact = new Set<string>();
    for (const inv of invoices) {
      if (inv.status === 'draft' || inv.status === 'void') continue;
      const owed = Number(inv.total) - Number(inv.amount_paid);
      balanceByContact.set(inv.contact_id, (balanceByContact.get(inv.contact_id) ?? 0) + owed);
      if (inv.status === 'overdue') overdueByContact.add(inv.contact_id);
    }

    type ContactWithProfile = Contact & {
      patient_profiles: { birth_date: string | null; patient_group: string | null } | null;
    };

    const enriched: PatientRow[] = (contactRows as ContactWithProfile[]).map((c) => {
      const next = nextByContact.get(c.id) ?? null;
      const last = lastByContact.get(c.id) ?? null;
      const chosen = next ?? last;
      return {
        contact: c,
        age: computeAge(c.patient_profiles?.birth_date),
        patientGroup: c.patient_profiles?.patient_group?.trim() || null,
        nextAppointment: next
          ? { startAt: next.start_at, serviceTypeName: next.service_type?.name ?? null }
          : null,
        treatmentLabel: chosen?.service_type?.name ?? null,
        balance: balanceByContact.get(c.id) ?? 0,
        hasOverdue: overdueByContact.has(c.id),
        isActive: activeContacts.has(c.id),
      };
    });

    setRows(enriched);
    setLoading(false);
  }, [supabase, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return { rows, loading, reload };
}
