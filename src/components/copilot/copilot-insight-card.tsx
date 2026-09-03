import type { ComponentType } from "react";
import Link from "next/link";

interface Props {
  icon: ComponentType<{ className?: string }>;
  category: string;
  title: string;
  detail: string;
  href: string;
  linkLabel: string;
}

/** Una tarjeta de "Lo que Zen detectó" — usada por cada tipo de señal
 *  en copilot-insights-panel.tsx. */
export function CopilotInsightCard({ icon: Icon, category, title, detail, href, linkLabel }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{category}</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      <Link href={href} className="mt-2 inline-block text-xs font-medium text-primary hover:text-primary/80">
        {linkLabel} →
      </Link>
    </div>
  );
}
