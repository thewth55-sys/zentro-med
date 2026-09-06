"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { isPostHogEnabled, posthog } from "@/lib/analytics/posthog";

/**
 * Manual $pageview capture on every App Router client-side navigation
 * — instrumentation-client.ts sets `capture_pageview: false` because
 * posthog-js's own history-based autodetection doesn't reliably see
 * Next's client-side transitions (the official PostHog/Next.js App
 * Router guidance). Headless — renders nothing.
 */
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isPostHogEnabled || !pathname) return;
    const query = searchParams.toString();
    posthog.capture("$pageview", { $current_url: query ? `${pathname}?${query}` : pathname });
  }, [pathname, searchParams]);

  return null;
}
