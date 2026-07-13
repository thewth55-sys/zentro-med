import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { getPublicBookingConfig } from "@/lib/scheduling/public-booking";
import { BookingWidget } from "@/components/public-booking/booking-widget";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = await getPublicBookingConfig(supabaseAdmin(), slug);
  return {
    title: config ? `Agendar cita — ${config.accountName}` : "Agendar cita",
  };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = await getPublicBookingConfig(supabaseAdmin(), slug);

  if (!config) notFound();

  return (
    <div className="min-h-screen bg-background px-4 py-16 text-foreground">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">{config.accountName}</h1>
          <p className="mt-2 text-muted-foreground">Agenda tu cita en línea</p>
        </div>
        <div className="mt-8">
          <BookingWidget slug={slug} config={config} />
        </div>
      </div>
    </div>
  );
}
