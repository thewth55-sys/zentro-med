import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The Android app is a thin wrapper — no bundled web build. `server.url`
 * points the WebView straight at production, so a web deploy is
 * automatically what the app shows; only native-only changes (this
 * file, the android/ project, plugin config) ever need a new APK/AAB.
 *
 * Starts at /login, not the marketing root — src/middleware.ts already
 * redirects an authenticated visitor away from /login to /dashboard,
 * so a returning signed-in user skips straight through; a logged-out
 * user sees the login form immediately instead of the landing page.
 */
const config: CapacitorConfig = {
  appId: "com.zentrolabs.zentromed",
  appName: "Zentro Med",
  webDir: "mobile-www",
  server: {
    url: "https://med.zentrolabs.com/login",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
