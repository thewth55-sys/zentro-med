"use client"

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/currency'
import {
  MessageSquare,
  UserPlus,
  TrendingUp,
  Receipt,
  CalendarX,
  Users,
} from 'lucide-react'

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadSparklines,
  loadTodayAppointments,
  loadNextAppointment,
  loadResponseTime,
  loadTodayBilling,
} from '@/lib/dashboard/queries'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  SparklineBundle,
  TodayAppointmentItem,
  ResponseTimeSummary,
} from '@/lib/dashboard/types'

import { MetricCard } from '@/components/dashboard/metric-card'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ConversationsChart } from '@/components/dashboard/conversations-chart'
import { TodayAppointments } from '@/components/dashboard/today-appointments'
import { DashboardHero } from '@/components/dashboard/dashboard-hero'
import { PrioritiesPanel } from '@/components/dashboard/priorities-panel'
import { ResponseTimeChart } from '@/components/dashboard/response-time-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { AnnouncementsCarousel } from '@/components/dashboard/announcements-carousel'

import { useTranslations } from 'next-intl'

type RangeDays = 7 | 30 | 90

export default function DashboardPage() {
  const t = useTranslations('Dashboard.page')
  const { defaultCurrency } = useAuth()
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [sparks, setSparks] = useState<SparklineBundle | null>(null)

  const [range, setRange] = useState<RangeDays>(30)
  // Keep a cache per range so switching tabs doesn't re-fetch what we
  // already have. Ranges the user hasn't opened yet stay null and
  // trigger a fetch on first view.
  const [series, setSeries] = useState<Record<RangeDays, ConversationsSeriesPoint[] | null>>({
    7: null,
    30: null,
    90: null,
  })
  const [seriesLoading, setSeriesLoading] = useState(true)

  const [todayAppointments, setTodayAppointments] = useState<TodayAppointmentItem[] | null>(null)
  const [todayAppointmentsLoading, setTodayAppointmentsLoading] = useState(true)

  const [nextAppointment, setNextAppointment] = useState<TodayAppointmentItem | null>(null)
  const [nextAppointmentLoading, setNextAppointmentLoading] = useState(true)

  const [todayBilling, setTodayBilling] = useState<number | null>(null)
  const [todayBillingLoading, setTodayBillingLoading] = useState(true)

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(null)
  const [responseTimeLoading, setResponseTimeLoading] = useState(true)

  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)

  const loadAll = useCallback(() => {
    const db = createClient()

    // Kick everything off in parallel. Each block has its own
    // setState + finally so a slow query doesn't hold up faster
    // sections — each widget shows its own skeleton independently.
    void loadMetrics(db)
      .then((m) => setMetrics(m))
      .catch((err) => console.error('[dashboard] metrics failed:', err))
      .finally(() => setMetricsLoading(false))

    void loadConversationsSeries(db, 30)
      .then((s) => setSeries((prev) => ({ ...prev, 30: s })))
      .catch((err) => console.error('[dashboard] series failed:', err))
      .finally(() => setSeriesLoading(false))

    // KPI sparklines — non-critical, so no loading gate; cards render
    // fine without them and the mini-charts fade in when ready.
    void loadSparklines(db)
      .then((s) => setSparks(s))
      .catch((err) => console.error('[dashboard] sparklines failed:', err))

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

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => console.error('[dashboard] response time failed:', err))
      .finally(() => setResponseTimeLoading(false))

    // Fetch up to 50 so the biggest page-size option in the feed
    // (50 rows) is already in memory — switching sizes then becomes
    // a pure client-side slice with no extra round trip.
    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error('[dashboard] activity failed:', err))
      .finally(() => setActivityLoading(false))
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

  // Range switch handler — kept in an event callback (not an effect)
  // so the setState calls stay out of the react-hooks/set-state-in-effect
  // rule's way. The cached bucket check means switching back to a
  // previously-viewed range is instant and doesn't re-fetch.
  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r)
      if (series[r] !== null) return
      setSeriesLoading(true)
      const db = createClient()
      loadConversationsSeries(db, r)
        .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
        .catch((err) => console.error('[dashboard] series failed:', err))
        .finally(() => setSeriesLoading(false))
    },
    [series],
  )

  const citasHoyCount = todayAppointments?.length ?? null
  const sinConfirmarCount = todayAppointments?.filter((a) => a.status === 'pending').length ?? null

  return (
    <div className="space-y-5">
      {/* Hero: saludo + los 3 números que importan antes de la primera
          consulta (citas hoy, sin confirmar, por cobrar hoy) + próxima
          cita + en consulta ahora. */}
      <DashboardHero
        nextAppointment={nextAppointment}
        nextAppointmentLoading={nextAppointmentLoading}
        currentAppointment={currentAppointment}
        citasHoyCount={citasHoyCount}
        sinConfirmarCount={sinConfirmarCount}
        todayBilling={todayBilling}
        statsLoading={todayAppointmentsLoading || todayBillingLoading}
      />

      {/* Tu día (columna principal) + rail derecho con lo que el
          assessment pidió agrupado ahí: prioridades, ingresos, accesos
          rápidos — mismo layout de dos columnas que el mockup aprobado. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodayAppointments items={todayAppointments} loading={todayAppointmentsLoading} />
        </div>
        <div className="space-y-4 lg:col-span-1">
          <PrioritiesPanel todayAppointments={todayAppointments} loading={todayAppointmentsLoading} />
          {metricsLoading || !metrics ? (
            <SkeletonCard />
          ) : (
            <MetricCard
              title={t('revenueCollected')}
              accent="green"
              spark={sparks?.revenue}
              value={`${metrics.revenueCollectedRatio.current}%`}
              icon={Receipt}
              subtitle={t('revenueCollectedSubtitle', {
                ratio: metrics.revenueCollectedRatio.current,
                quoted: formatCurrency(metrics.revenueQuotedAmount, defaultCurrency),
              })}
            />
          )}
          <QuickActions />
        </div>
      </div>

      {/* Admin-controlled promos/announcements — demovido debajo del
          contenido accionable, no antes. */}
      <AnnouncementsCarousel />

      {/* Métricas restantes — más CRM/marketing que clínicas del día a
          día, se quedan demovidas hasta aquí. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricsLoading || !metrics ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              title={t('activeConversations')}
              accent="teal"
              spark={sparks?.conversations}
              value={metrics.activeConversations.current.toLocaleString()}
              icon={MessageSquare}
              delta={{
                sign: metrics.activeConversations.previous,
                label: deltaLabel(
                  metrics.activeConversations.previous,
                  t('newTodayVsYesterday'),
                  t('noChange', { suffix: t('newTodayVsYesterday') })
                ),
              }}
            />
            <MetricCard
              title={t('newContactsToday')}
              accent="indigo"
              spark={sparks?.contacts}
              value={metrics.newContactsToday.current.toLocaleString()}
              icon={UserPlus}
              delta={{
                sign:
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                label: deltaLabel(
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                  t('vsYesterday'),
                  t('noChange', { suffix: t('vsYesterday') })
                ),
              }}
            />
            <MetricCard
              title={t('conversionRate')}
              accent="sky"
              value={`${metrics.conversionRate.current}%`}
              icon={TrendingUp}
              delta={{
                sign: metrics.conversionRate.current - metrics.conversionRate.previous,
                label: deltaLabel(
                  metrics.conversionRate.current - metrics.conversionRate.previous,
                  t('conversionPtsSuffix'),
                  t('noChange', { suffix: t('conversionPtsSuffix') })
                ),
              }}
            />
            <MetricCard
              title={t('noShowRate')}
              accent="amber"
              value={`${metrics.noShowRate.current}%`}
              icon={CalendarX}
              subtitle={t('noShowSubtitle', { value: metrics.noShowRate.previous })}
            />
            <MetricCard
              title={t('newPatients')}
              accent="rose"
              value={`${metrics.newPatientsRatio.current}%`}
              icon={Users}
              subtitle={t('newPatientsSubtitle', {
                newCount: metrics.newPatientsCount,
                returningCount: metrics.returningPatientsCount,
              })}
            />
          </>
        )}
      </div>

      {/* Conversaciones — analítica de WhatsApp, ya no comparte fila con
          Tu día (promovida arriba a su propia fila de ancho completo). */}
      <ConversationsChart
        series={series}
        loading={seriesLoading}
        range={range}
        onRangeChange={handleRangeChange}
      />

      {/* Response time */}
      <ResponseTimeChart data={responseTime} loading={responseTimeLoading} />

      {/* Activity feed */}
      <ActivityFeed items={activity} loading={activityLoading} />
    </div>
  )
}

// ------------------------------------------------------------

function deltaLabel(delta: number, suffix: string, noChangeLabel: string): string {
  if (delta === 0) return noChangeLabel
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()} ${suffix}`
}

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
