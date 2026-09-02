'use client'

import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { TodayAppointmentItem } from '@/lib/dashboard/types'
import { cn } from '@/lib/utils'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

const STATUS_STYLES: Record<TodayAppointmentItem['status'], string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  no_show: 'bg-red-500/10 text-red-400 border-red-500/30',
}

const timeFormatter = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' })

// Deterministic avatar tint per patient so the same person keeps the
// same color across renders (like the mockup's colored initials).
const AVATAR_TINTS = [
  'bg-teal-500/15 text-teal-600 dark:text-teal-300',
  'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
  'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  'bg-primary/12 text-primary',
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function tintFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_TINTS[h % AVATAR_TINTS.length]
}

/**
 * Replaces the old sales-pipeline donut on the dashboard — a clinic's
 * day-to-day operational question is "who's coming in today", not
 * deal-stage value. Read-only; edits stay in the Agenda view.
 */
export function TodayAppointments({
  items,
  loading,
}: {
  items: TodayAppointmentItem[] | null
  loading: boolean
}) {
  const t = useTranslations('Dashboard.todayAppointments')
  const tStatus = useTranslations('Pipelines.appointments.status')

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('title')}</h2>
          <p className="text-xs text-muted-foreground">{t('description')}</p>
        </div>
        <Link href="/agenda" className="text-xs font-medium text-primary hover:text-primary/80">
          {t('viewAgenda')}
        </Link>
      </header>

      {loading || !items ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 p-5">
          <EmptyState icon={CalendarClock} title={t('empty')} hint={t('emptyHint')} />
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-border overflow-y-auto">
          {items.map((appt) => {
            const name = appt.patientName || t('noPatient')
            return (
              <li key={appt.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    tintFor(name),
                  )}
                  aria-hidden="true"
                >
                  {initials(name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[appt.doctorName, appt.serviceTypeName].filter(Boolean).join(' · ') || t('noDetails')}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {timeFormatter.format(new Date(appt.startAt))}
                  </span>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                      STATUS_STYLES[appt.status],
                    )}
                  >
                    {tStatus(appt.status)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
