import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { getPublicBookingConfig } from "@/lib/scheduling/public-booking";
import { BookingPagePreview } from "@/components/public-booking/booking-page-preview";

// Deliberately static (no Supabase call) — Next's build-time route
// analysis ("Collecting page data") can invoke generateMetadata
// speculatively even for a route with no generateStaticParams, and a
// live DB call there hung indefinitely on a build container that
// apparently can't reach Supabase (unlike the runtime container).
export const metadata: Metadata = { title: "Agendar cita" };

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = await getPublicBookingConfig(supabaseAdmin(), slug);

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
