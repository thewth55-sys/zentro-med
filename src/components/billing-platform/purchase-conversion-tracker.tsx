"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { META_PIXEL_ID } from "@/lib/meta-pixel";

// Mirrors signup/page.tsx's local literal: PLAN_CONFIG lives in
// lib/billing-platform/plans.ts, which reads server-only Stripe env
// vars at module scope — importing it here (a client component) would
// bundle those reads uselessly. Prices are static per plan, so this
// mirror needs updating only if pricing itself changes (same upkeep
// the landing page's own hardcoded prices already require).
const PLAN_VALUE_USD: Record<string, number> = {
  esencial: 39,
  profesional: 79,
  clinica: 149,
};

/**
 * Headless — mounted once in DashboardShell. Fires the Meta Pixel
 * `Purchase` value event the moment a user lands back from a
 * successful Stripe Checkout (`?checkout=success&plan=<id>`, set by
 * /api/billing-platform/checkout's success_url). This is the one
 * genuine "value conversion" in the funnel — everything on the public
 * landing (Lead/InitiateCheckout) fires before payment, with no
 * confirmed revenue behind it.
 *
 * The dashboard never loads the base pixel script (only the public
 * landing pages do), so the same init snippet used there is rendered
 * here too, guarded by `if(f.fbq)return` — same upstream Meta snippet,
 * just conditionally mounted instead of always-on.
 */
function PurchaseConversionTrackerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [purchaseValue, setPurchaseValue] = useState<number | null>(null);

  useEffect(() => {
    if (searchParams.get("checkout") !== "success") return;
    const plan = searchParams.get("plan");
    const value = plan ? PLAN_VALUE_USD[plan] : undefined;
    if (value === undefined) {
      console.warn("[PurchaseConversionTracker] unknown or missing plan, Purchase event not fired:", plan);
    } else {
      setPurchaseValue(value);
    }

    // Strip the params so a refresh/back-nav doesn't re-fire the event
    // — same idiom as AuthConfirmedToast's `auth=confirmed` cleanup.
    const params = new URLSearchParams(searchParams);
    params.delete("checkout");
    params.delete("plan");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (purchaseValue === null) return null;

  return (
    <Script id="zm-meta-pixel-purchase" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${META_PIXEL_ID}');
        fbq('track', 'Purchase', {value: ${purchaseValue}, currency: 'USD'});
      `}
    </Script>
  );
}

export function PurchaseConversionTracker() {
  return (
    <Suspense fallback={null}>
      <PurchaseConversionTrackerInner />
    </Suspense>
  );
}
