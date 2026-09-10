import { cache } from "react";
import { notFound } from "next/navigation";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import type { Metadata } from "next";

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { getPublicBookingConfig } from "@/lib/scheduling/public-booking";
import { BookingPagePreview } from "@/components/public-booking/booking-page-preview";

const FALLBACK_TITLE = "Agendar cita";

// Deduped with React's cache() so generateMetadata and the page body
// below share one Supabase round trip per request instead of two.
const loadConfig = cache((slug: string) => getPublicBookingConfig(supabaseAdmin(), slug));

// Next's build-time route analysis ("Collecting page data") can
// invoke generateMetadata speculatively even for a route with no
// generateStaticParams, and a live DB call there hung indefinitely on
// a build container that apparently can't reach Supabase (unlike the
// runtime container) — skip the fetch during that phase only. The
// title is set as `absolute` to bypass the root layout's "%s — Zentro
// Med" template: this is the patient-facing, white-labeled page, not
// staff-facing, so it shouldn't carry Zentro Med's own brand.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return { title: { absolute: FALLBACK_TITLE } };
  }
  const { slug } = await params;
  const config = await loadConfig(slug);
  return { title: { absolute: config?.accountName || FALLBACK_TITLE } };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = await loadConfig(slug);

  if (!config) notFound();

  const p = config.page ?? {};

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8 text-foreground">
      <div className="mx-auto w-full max-w-md">
        <BookingPagePreview
          page={p}
          accountName={config.accountName}
          accountLogoUrl={config.accountLogoUrl}
          address={config.address}
          serviceTypes={config.serviceTypes}
          businessHours={config.businessHours}
          interactive
          slug={slug}
          bookingConfig={config}
        />
      </div>
    </div>
  );
}
