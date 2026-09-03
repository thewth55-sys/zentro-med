"use client"

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import {
  loadMonthlyRevenue,
  loadTodayAppointments,
  loadNextAppointment,
  loadTodayBilling,
} from '@/lib/dashboard/queries'
import type {
  MonthlyRevenuePoint,
  TodayAppointmentItem,
} from '@/lib/dashboard/types'

import { QuickActions } from '@/components/dashboard/quick-actions'
import { TodayAppointments } from '@/components/dashboard/today-appointments'
import { DashboardHero } from '@/components/dashboard/dashboard-hero'
import { PrioritiesPanel } from '@/components/dashboard/priorities-panel'
import { MonthlyRevenueCard } from '@/components/dashboard/monthly-revenue-card'
import { AnnouncementsCarousel } from '@/components/dashboard/announcements-carousel'

import { useTranslations } from 'next-intl'

export default function DashboardPage() {
  const t = useTranslations('Dashboard.page')

  const [todayAppointments, setTodayAppointments] = useState<TodayAppointmentItem[] | null>(null)
  const [todayAppointmentsLoading, setTodayAppointmentsLoading] = useState(true)

  const [nextAppointment, setNextAppointment] = useState<TodayAppointmentItem | null>(null)
  const [nextAppointmentLoading, setNextAppointmentLoading] = useState(true)

  const [todayBilling, setTodayBilling] = useState<number | null>(null)
  const [todayBillingLoading, setTodayBillingLoading] = useState(true)

  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenuePoint[] | null>(null)
  const [monthlyRevenueLoading, setMonthlyRevenueLoading] = useState(true)

  const loadAll = useCallback(() => {
    const db = createClient()

    // Kick everything off in parallel. Each block has its own
    // setState + finally so a slow query doesn't hold up faster
    // sections — each widget shows its own skeleton independently.
    void loadTodayAppointments(db)
      .then((a) => setTodayAppointments(a))
      .catch((err) => console.error('[dashboard] today appointments failed:', err))
      .finally(() => setTodayAppointmentsLoading(false))

    void loadNextAppointment(db)
      .then((a) => setNextAppointment(a))
      .catch((err) => console.error('[dashboard] next appointment failed:', err))
      .finally(() => setNextAppointmentLoading(false))

    void loadTodayBilling(db)
      .then((b) => setTodayBilling(b))
      .catch((err) => console.error('[dashboard] today billing failed:', err))
      .finally(() => setTodayBillingLoading(false))

    void loadMonthlyRevenue(db)
      .then((r) => setMonthlyRevenue(r))
      .catch((err) => console.error('[dashboard] monthly revenue failed:', err))
      .finally(() => setMonthlyRevenueLoading(false))
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // "En consulta ahora" — derivado del día ya cargado (start_at <= now <=
  // end_at, sin contar citas canceladas/no-show), cero queries nuevas.
  // Deliberadamente NO memoizado: "ahora" avanza en cada render, así que
  // cachear el resultado dejaría la tarjeta pegada a una cita que ya
  // terminó hasta el próximo cambio de `todayAppointments`. `Date.now()`
  // es una función impura y useMemo exige pureza, así que esto se
  // recalcula (barato — un solo array.find) en cada render en su lugar.
  const currentAppointment = findCurrentAppointment(todayAppointments)

  const citasHoyCount = todayAppointments?.length ?? null
  const sinConfirmarCount = todayAppointments?.filter((a) => a.status === 'pending').length ?? null

  return (
    <div className="space-y-5">
      {/* Fila 1 del mockup: hero (saludo + fecha + los 3 números del
          día) a la izquierda, Prioridades de hoy a la derecha en la
          MISMA fila — no debajo, como estaba antes. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardHero
            nextAppointment={nextAppointment}
            nextAppointmentLoading={nextAppointmentLoading}
            currentAppointment={currentAppointment}
            citasHoyCount={citasHoyCount}
            sinConfirmarCount={sinConfirmarCount}
            todayBilling={todayBilling}
            statsLoading={todayAppointmentsLoading || todayBillingLoading}
          />
        </div>
        <div className="lg:col-span-1">
          <PrioritiesPanel todayAppointments={todayAppointments} loading={todayAppointmentsLoading} />
        </div>
      </div>

      {/* Fila 2 del mockup: Tu día (lista de citas) a la izquierda,
          Ingresos del mes + Accesos rápidos apilados a la derecha. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodayAppointments items={todayAppointments} loading={todayAppointmentsLoading} />
        </div>
        <div className="space-y-4 lg:col-span-1">
          <MonthlyRevenueCard data={monthlyRevenue} loading={monthlyRevenueLoading} />
          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">{t('quickActionsTitle')}</h2>
            <QuickActions />
          </div>
        </div>
      </div>

      {/* Admin-controlled promos/announcements — el mockup del panel no
          las incluye, pero es contenido administrable aparte, no
          analítica de mensajería, así que se queda. */}
      <AnnouncementsCarousel />
    </div>
  )
}

// ------------------------------------------------------------

function findCurrentAppointment(items: TodayAppointmentItem[] | null): TodayAppointmentItem | null {
  if (!items) return null
  const now = Date.now()
  return (
    items.find((appt) => {
      if (appt.status === 'cancelled' || appt.status === 'no_show') return false
      const start = new Date(appt.startAt).getTime()
      const end = new Date(appt.endAt).getTime()
      return start <= now && now <= end
    }) ?? null
  )
}
