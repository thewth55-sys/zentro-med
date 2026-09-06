import type { Metadata } from "next";
import Script from "next/script";
import "../landing.css";
import { LANDING_BEHAVIOR_SCRIPT } from "../landing-content";
import { ZEN_STRUCTURED_DATA, ZEN_BODY_HTML } from "./zen-content";
import { META_PIXEL_ID } from "@/lib/meta-pixel";

// Zen landing — dedicated page for the AI copilot feature, linked from the
// CRM root landing's nav ("Zen") and cross-sell copy. Same raw-HTML-string
// architecture as the root landing and /marketing (see src/app/page.tsx's
// own comment for why) — reuses LANDING_BEHAVIOR_SCRIPT verbatim since
// mobile menu / FAQ accordion / scroll-reveal are all generic DOM queries,
// nothing page-specific.
export const metadata: Metadata = {
  title: "Zen — La recepcionista que nunca se va a comer",
  description:
    "Zen contesta WhatsApp a cualquier hora, agenda dentro de la conversación y ejecuta acciones por voz con tu confirmación. Incluido en Zentro Med, sin costo aparte.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://med.zentrolabs.com/zen" },
  openGraph: {
    type: "website",
    siteName: "Zentro Med",
    title: "Zen — La recepcionista que nunca se va a comer",
    description:
      "Zen contesta WhatsApp a cualquier hora, agenda dentro de la conversación y ejecuta acciones por voz con tu confirmación. Incluido en Zentro Med, sin costo aparte.",
    url: "https://med.zentrolabs.com/zen",
    // TODO: this image doesn't exist in /public yet — upload it before
    // this page ships, or Facebook/WhatsApp link previews show nothing.
    images: ["https://med.zentrolabs.com/og-zentro-med-zen.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zen — La recepcionista que nunca se va a comer",
    description:
      "Zen contesta WhatsApp a cualquier hora, agenda dentro de la conversación y ejecuta acciones por voz con tu confirmación.",
    images: ["https://med.zentrolabs.com/og-zentro-med-zen.png"],
  },
};

export default function ZenPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- deliberately scoped to just this page, not the app-wide font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ZEN_STRUCTURED_DATA) }} />

      <div className="zm-landing" dangerouslySetInnerHTML={{ __html: ZEN_BODY_HTML }} />

      <Script id="zm-lucide" src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" strategy="afterInteractive" />
      <Script
        id="zm-behavior"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: LANDING_BEHAVIOR_SCRIPT }}
      />
      <Script id="zm-meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- tracking pixel, not a real content image */}
        <img
          height={1}
          width={1}
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-C701FB52EP" strategy="afterInteractive" />
      <Script id="zm-ga4" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-C701FB52EP');
        `}
      </Script>
    </>
  );
}
