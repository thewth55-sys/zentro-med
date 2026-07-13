// Browser-side Sentry init — Next.js auto-loads this file (no manual
// import needed) as of the instrumentation-client convention. Set
// NEXT_PUBLIC_SENTRY_DSN to enable; no-ops without it, same as the
// server/edge configs (see sentry.server.config.ts).

import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    // Session replay is off — this app renders patient data (names,
    // phone numbers, clinical notes); recording sessions would send
    // that to a third party by default, which needs an explicit
    // privacy decision this project hasn't made yet, not a default-on
    // integration.
  });
}

// Lets Sentry trace App Router client-side navigations as their own
// transactions instead of only seeing the initial page load.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
