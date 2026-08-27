import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: ReactNode
  /** Optional secondary line under the title. */
  description?: ReactNode
  /** Optional accent icon chip to the left of the title. */
  icon?: ComponentType<{ className?: string }>
  /** Right-aligned actions (buttons, filters). Stack below on mobile. */
  actions?: ReactNode
  className?: string
}

/**
 * Shared page header for the dashboard views — consistent typography,
 * spacing and responsive behavior (title stacks above actions on
 * mobile, side-by-side on ≥sm). Replaces the ad-hoc `<h1>` each page
 * used to roll on its own.
 */
export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Icon className="size-5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
