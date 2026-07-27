'use client'

import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { TodayAppointmentItem } from '@/lib/dashboard/types'
import { startOfLocalDay } from '@/lib/dashboard/date-utils'
import { cn } from '@/lib/utils'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

const STATUS_STYLES: Record<TodayAppointmentItem['status'], string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  completed: 'bg-primary/10 text-primary border-primary/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  no_show: 'bg-red-500/10 text-red-400 border-red-500/30',
}

const timeFormatter = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' })
const dateFormatter = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })

/**
 * The dashboard's single "what's coming up next" card — distinct from
 * TodayAppointments' full list of today's schedule. Looks ahead past
 * today too, so a clinic that's done for the day still sees when
 * their next patient is coming (e.g. tomorrow morning).
 */
export function NextAppointmentCard({
  item,
  loading,
}: {
  item: TodayAppointmentItem | null
  loading: boolean
}) {
  const t = useTranslations('Dashboard.nextAppointment')
  const tStatus = useTranslations('Pipelines.appointments.status')

  function formatWhen(startAt: string): string {
    const date = new Date(startAt)
    const diffDays = Math.round(
      (startOfLocalDay(date).getTime() - startOfLocalDay().getTime()) / 86_400_000,
    )
    const time = timeFormatter.format(date)
    if (diffDays === 0) return t('todayAt', { time })
    if (diffDays === 1) return t('tomorrowAt', { time })
    return `${dateFormatter.format(date)} · ${time}`
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-5 py-4">
        <CalendarClock className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{t('title')}</h2>
      </header>

      {loading ? (
        <div className="p-5">
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !item ? (
        <div className="p-5">
          <EmptyState icon={CalendarClock} title={t('empty')} hint={t('emptyHint')} />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground">{formatWhen(item.startAt)}</p>
            <p className="truncate text-sm text-foreground">
              {item.patientName || t('noPatient')}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {[item.doctorName, item.serviceTypeName].filter(Boolean).join(' · ') || t('noDetails')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                STATUS_STYLES[item.status],
              )}
            >
              {tStatus(item.status)}
            </span>
            <Link href="/agenda" className="text-xs font-medium text-primary hover:text-primary/80">
              {t('viewAgenda')}
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
