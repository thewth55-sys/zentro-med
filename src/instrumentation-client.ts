// Browser-side Sentry + PostHog init — Next.js auto-loads this file
// (no manual import needed) as of the instrumentation-client
// convention. Each SDK is independently gated by its own env var and
// no-ops without it — this file (and the app) works identically with
// neither configured.

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

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

    // `app://` frames are scripts injected by the native shell hosting
    // the page — Instagram/Facebook's in-app browser bridge, on both
    // iOS (sendDataToNative/sendPageHideMessage throwing on a missing
    // window.webkit.messageHandlers entry) and Android (their
    // navigation_performance_logger_android script throwing "Java
    // object is gone" when the WebView tears down its JS-to-Java
    // bridge mid-navigation). Never our own bundle, never fixable from
    // here — the injected script runs before our code and calls a
    // native handler that may or may not exist depending on the host
    // app's version. The message-text entries below are a fallback for
    // when a frame's URL doesn't get picked up by denyUrls.
    denyUrls: [/^app:\/\//],
    ignoreErrors: ["window.webkit.messageHandlers", "Java object is gone"],
  });
}

// Lets Sentry trace App Router client-side navigations as their own
// transactions instead of only seeing the initial page load.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// Product analytics — set NEXT_PUBLIC_POSTHOG_KEY to enable; no-ops
// without it. Loaded directly from PostHog's own cloud (no reverse
// proxy) — same call this project already made for Sentry's tunnelRoute
// (see next.config.ts): an internal clinic CRM's staff aren't the
// ad-blocker-evasion audience a public consumer product needs to
// worry about, so the extra permanent route isn't worth it here.
//
// Privacy decisions (deliberate, not defaults):
//   - `disable_session_recording: true` — belt-and-suspenders against
//     this project's own patient-data precedent (see the Sentry
//     Session Replay comment above): even if replay were ever toggled
//     on in the PostHog project's own dashboard settings, this client
//     flag keeps it from ever actually starting from this app.
//   - `mask_all_text: true` — autocapture is ON (clicks, form
//     submits), but every captured element's visible text is masked.
//     This app's DOM is full of patient names/phone numbers rendered
//     as plain text (contact lists, headers, tables) — masking text
//     keeps "what was clicked" analytics (element type, URL, CSS
//     selector) while never sending what that text actually said.
//   - `capture_pageview: false` — captured manually instead (see
//     src/components/analytics/posthog-page-view.tsx), since
//     autocapture's history-based pageview detection doesn't reliably
//     see Next.js App Router client-side transitions.
//   - `person_profiles: 'identified_only'` — no anonymous/pre-login
//     profiles created; this is an authenticated staff tool, not a
//     public funnel, so every real profile is tied to a signed-in
//     account_id via posthog.identify() (see posthog-identify.tsx).
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
    disable_session_recording: true,
    autocapture: true,
    mask_all_text: true,
  });
}
