import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

/**
 * Shared empty state for the Marketing nav group's "PRONTO" tabs —
 * real, navigable pages (not a disabled link) that just say the
 * feature isn't built yet, instead of pretending it exists with
 * fabricated data.
 */
export function ComingSoonState({ icon: Icon, description }: { icon: LucideIcon; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="size-3.5 text-amber-400" />
          Próximamente
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
