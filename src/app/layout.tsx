import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemedToaster } from "@/components/themed-toaster";
import { PwaRegister } from "@/components/pwa-register";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_STORAGE_KEY,
  MODES,
  STORAGE_KEY,
  THEME_IDS,
} from "@/lib/themes";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Zentro Med",
    template: "%s — Zentro Med",
  },
  description: "CRM/EHR médico multi-tenant con bandeja de WhatsApp, agenda, expediente clínico y facturación.",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [{ url: "/icon" }],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  // iOS Safari ignores most of the web manifest for "Add to Home
  // Screen" — these Apple-specific meta tags are what actually make
  // it install as a standalone app there instead of just bookmarking
  // the page.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zentro Med",
  },
};

export const viewport: Viewport = {
  // Matches light mode's --background (now the default — see
  // DEFAULT_MODE in lib/themes.ts) instead of the old dark navy, so
  // the OS status bar/PWA chrome doesn't clash on first load.
  themeColor: "#fafafa",
  colorScheme: "light dark",
};

// Inline boot script — runs before React hydrates so the user's
// chosen accent (data-theme) AND mode (data-mode) are on the <html>
// element before first paint. Without this every page load flashes
// the server-rendered defaults for a frame before the React tree
// mounts and applies the picked values.
//
// Kept dependency-free (no imports, no JSX) — must be a string the
// browser can run as a single <script>. Knowledge of valid ids is
// sourced from the THEME_IDS / MODES constants so adding one doesn't
// silently break the boot path.
const THEME_BOOT_SCRIPT = `
(function(){
  var d = document.documentElement;
  try {
    var THEME_KEY = ${JSON.stringify(STORAGE_KEY)};
    var THEME_DEFAULT = ${JSON.stringify(DEFAULT_THEME)};
    var THEMES = ${JSON.stringify(THEME_IDS)};
    var savedTheme = localStorage.getItem(THEME_KEY);
    d.dataset.theme = THEMES.indexOf(savedTheme) !== -1 ? savedTheme : THEME_DEFAULT;

    var MODE_KEY = ${JSON.stringify(MODE_STORAGE_KEY)};
    var MODE_DEFAULT = ${JSON.stringify(DEFAULT_MODE)};
    var MODES = ${JSON.stringify(MODES)};
    var savedMode = localStorage.getItem(MODE_KEY);
    d.dataset.mode = MODES.indexOf(savedMode) !== -1 ? savedMode : MODE_DEFAULT;
  } catch (_e) {
    d.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
    d.dataset.mode = ${JSON.stringify(DEFAULT_MODE)};
  }
})();
`;

// Zoho Desk chat widget (customer support), on every page including
// the public marketing/auth pages, not just the authenticated
// dashboard. The nonce Zoho's snippet expects is dropped — this app's
// CSP ships as Content-Security-Policy-Report-Only (see
// next.config.ts) with no nonce-issuing machinery, so a literal
// '{place_your_nonce_value_here}' placeholder would just be dead
// weight, not a working nonce. im.zoho.com is allowlisted in
// next.config.ts's script-src/connect-src for when that CSP is
// eventually flipped to enforced.
const ZOHO_DESK_WIDGET_SCRIPT = `
window.ZOHOIM = window.ZOHOIM || function(a, b) { ZOHOIM[a] = b; };
window.ZOHOIM.prefilledMessage = "";
(function() {
  var d = document;
  var s = d.createElement('script');
  s.type = 'text/javascript';
  s.defer = true;
  s.src = "https://im.zoho.com/api/v1/public/channel/fbfb7e1887b655f1bbbff99948f9b2aa/widget";
  d.getElementsByTagName('head')[0].appendChild(s);
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-theme={DEFAULT_THEME}
      data-mode={DEFAULT_MODE}
      className={`${inter.variable} h-full antialiased`}
      // The `theme-boot` script below rewrites `data-theme` and
      // `data-mode` on <html> from localStorage before React hydrates,
      // so for any non-default choice the client DOM intentionally
      // differs from the server-rendered defaults. suppressHydration-
      // Warning silences the expected mismatch — it only applies to
      // this element's own attributes, so genuine mismatches in
      // children still surface.
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground font-sans">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider>
            {children}
            <ThemedToaster />
            <PwaRegister />
          </ThemeProvider>
        </NextIntlClientProvider>
        <Script
          id="zoho-desk-widget"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: ZOHO_DESK_WIDGET_SCRIPT }}
        />
      </body>
    </html>
  );
}
