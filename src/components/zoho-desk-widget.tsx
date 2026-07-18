"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

// Zoho Desk chat widget (customer support), on every page including
// the public marketing/auth pages, not just the authenticated
// dashboard — EXCEPT the root marketing landing ("/"), which ships its
// own WhatsApp float button and would otherwise show two floating
// chat bubbles stacked on top of each other.
//
// The nonce Zoho's snippet expects is dropped — this app's CSP ships
// as Content-Security-Policy-Report-Only (see next.config.ts) with no
// nonce-issuing machinery, so a literal '{place_your_nonce_value_here}'
// placeholder would just be dead weight, not a working nonce.
// im.zoho.com is allowlisted in next.config.ts's script-src/connect-src
// for when that CSP is eventually flipped to enforced.
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

// Zoho's own launcher bubble renders as a plain (non-shadow-DOM) <div>
// with a near-max z-index (2147483645) fixed to the bottom-right
// corner — confirmed live via devtools: `[data-id="im-bm-bubble"]`
// inside `#im-visitor-components`. Those data-* attributes are
// semantic/product-code-driven (not the accompanying `zim<hash>...`
// CSS module classes, which are build-hash-derived and would break on
// Zoho's next widget deploy), so they're the stable hook to override
// position from our own CSS. On /inbox this bubble sits directly over
// the message composer's send button — moved to the opposite corner
// there rather than hidden outright, so staff can still reach support
// chat from the busiest page in the app; every other route is
// unaffected. There's no documented JS config for this in Zoho's IM
// widget embed (unlike SalesIQ's), so a scoped CSS override is the
// only lever available short of hiding the widget entirely.
const INBOX_BUBBLE_REPOSITION_CSS = `
  [data-id="im-bm-bubble"] {
    right: auto !important;
    left: 16px !important;
  }
`;

export function ZohoDeskWidget() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <>
      <Script
        id="zoho-desk-widget"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: ZOHO_DESK_WIDGET_SCRIPT }}
      />
      {pathname?.startsWith("/inbox") && (
        <style id="zoho-desk-widget-inbox-override">{INBOX_BUBBLE_REPOSITION_CSS}</style>
      )}
    </>
  );
}
