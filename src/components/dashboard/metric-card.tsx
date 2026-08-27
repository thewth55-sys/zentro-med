import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { useId, type ComponentType } from 'react'
import { cn } from '@/lib/utils'

type Accent = 'teal' | 'indigo' | 'amber' | 'green' | 'sky' | 'rose'

const ACCENT_CHIP: Record<Accent, string> = {
  teal: 'bg-teal-500/12 text-teal-600 dark:text-teal-400',
  indigo: 'bg-indigo-500/12 text-indigo-500 dark:text-indigo-400',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  green: 'bg-primary/12 text-primary',
  sky: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
  rose: 'bg-rose-500/12 text-rose-500 dark:text-rose-400',
}

// Text-color class for the sparkline (SVG uses currentColor) so the
// mini-chart matches each card's icon chip accent.
const ACCENT_SPARK: Record<Accent, string> = {
  teal: 'text-teal-500 dark:text-teal-400',
  indigo: 'text-indigo-500 dark:text-indigo-400',
  amber: 'text-amber-500 dark:text-amber-400',
  green: 'text-primary',
  sky: 'text-sky-500 dark:text-sky-400',
  rose: 'text-rose-500 dark:text-rose-400',
}

interface MetricCardProps {
  title: string
  /** Pre-formatted value for display (e.g. "42" or "$1,250"). */
  value: string
  icon: ComponentType<{ className?: string }>
  /** Color del chip de icono (estilo mockup). Por defecto verde de marca. */
  accent?: Accent
  /**
   * Delta-mode secondary row: arrow + delta text. Omit when the metric
   * doesn't have a sensible comparison (e.g. total pipeline value).
   */
  delta?: {
    /** Positive / negative / zero drives arrow + color. */
    sign: number
    /** Pre-formatted delta, e.g. "+3 vs yesterday". */
    label: string
  }
  /** Used instead of `delta` when the metric has a static subtitle. */
  subtitle?: string
  /** Optional 14-day daily series → renders a tiny sparkline (real data only). */
  spark?: number[]
}

export function MetricCard({ title, value, icon: Icon, delta, subtitle, accent = 'green', spark }: MetricCardProps) {
  const hasSpark = Array.isArray(spark) && spark.length > 1 && spark.some((n) => n > 0)
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', ACCENT_CHIP[accent])}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="mt-3 text-[28px] leading-none font-bold tabular-nums text-foreground">
        {value}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {delta ? (
            <DeltaRow sign={delta.sign} label={delta.label} />
          ) : subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {hasSpark ? <Sparkline values={spark!} className={ACCENT_SPARK[accent]} /> : null}
      </div>
    </div>
  )
}

/**
 * Minimal area sparkline driven by real daily data. Uses currentColor so
 * the parent's accent text class tints both the stroke and the gradient.
 */
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const gradId = useId()
  const W = 72
  const H = 28
  const PAD = 2
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = (W - PAD * 2) / Math.max(values.length - 1, 1)
  const pts = values.map((v, i) => {
    const x = PAD + i * step
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2)
    return [x, y] as const
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  const area = `${line} L${last[0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2} fill="currentColor" />
    </svg>
  )
}

function DeltaRow({ sign, label }: { sign: number; label: string }) {
  const tone =
    sign > 0
      ? 'text-primary'
      : sign < 0
      ? 'text-red-400'
      : 'text-muted-foreground'
  const Arrow = sign > 0 ? ArrowUp : sign < 0 ? ArrowDown : Minus
  return (
    <div className={cn('flex items-center gap-1 text-sm', tone)}>
      <Arrow className="h-4 w-4" aria-hidden />
      <span className="tabular-nums">{label}</span>
    </div>
  )
}
