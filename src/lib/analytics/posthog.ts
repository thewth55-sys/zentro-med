import posthog from "posthog-js";

/** True once PostHog has actually been initialized (instrumentation-client.ts
 *  only calls posthog.init() when NEXT_PUBLIC_POSTHOG_KEY is set) — callers
 *  gate on this instead of assuming the singleton is always live, so the
 *  app behaves identically with analytics unconfigured. */
export const isPostHogEnabled = typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

export { posthog };
