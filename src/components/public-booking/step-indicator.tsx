"use client";

/**
 * Small breadcrumb above the wizard steps. Inherits the clinic's
 * brand color for free via the `--primary` CSS variable the parent
 * page already injects — no extra theming plumbing needed here.
 */
export function StepIndicator({
  steps,
  currentIndex,
}: {
  steps: string[];
  currentIndex: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      {steps.map((label, i) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            className={
              i === currentIndex
                ? "font-semibold text-primary"
                : i < currentIndex
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
            }
          >
            {i + 1} {label}
          </span>
          {i < steps.length - 1 && <span className="text-muted-foreground/30">·</span>}
        </span>
      ))}
    </div>
  );
}
