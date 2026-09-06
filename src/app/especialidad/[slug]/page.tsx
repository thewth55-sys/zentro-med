import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import "../../landing.css";
import { LANDING_BEHAVIOR_SCRIPT } from "../../landing-content";
import {
  SPECIALTY_CONTENT,
  SPECIALTY_SLUGS,
  buildEspecialidadBodyHtml,
  buildEspecialidadStructuredData,
  type SpecialtySlug,
} from "../specialty-content";
import { META_PIXEL_ID } from "@/lib/meta-pixel";

// Per-specialty landing — one shared template (specialty-content.ts)
// driven by a content object keyed by slug, instead of N hand-duplicated
// page copies. Same raw-HTML-string/landing.css architecture as the other
// landing pages (see src/app/page.tsx's own comment for why), except the
// HTML string itself is built at request/build time from data rather than
// hand-written. Slugs match src/lib/specialties.ts's ACCOUNT_SPECIALTIES,
// though only these 3 have dedicated landing copy today.
function isSpecialtySlug(slug: string): slug is SpecialtySlug {
  return (SPECIALTY_SLUGS as string[]).includes(slug);
}

export function generateStaticParams() {
  return SPECIALTY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isSpecialtySlug(slug)) return {};

  const data = SPECIALTY_CONTENT[slug];
  const title = `Zentro Med para ${data.tag} — ${data.h1}`;
  const url = `https://med.zentrolabs.com/especialidad/${slug}`;

  return {
    title,
    description: data.sub,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "Zentro Med",
      title,
      description: data.sub,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: data.sub,
    },
  };
}

export default async function EspecialidadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSpecialtySlug(slug)) notFound();

  const data = SPECIALTY_CONTENT[slug];
  const bodyHtml = buildEspecialidadBodyHtml(slug, data);
  const structuredData = buildEspecialidadStructuredData(slug, data);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- deliberately scoped to just this page, not the app-wide font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <div className="zm-landing" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

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
