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

export function ZohoDeskWidget() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <Script
      id="zoho-desk-widget"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: ZOHO_DESK_WIDGET_SCRIPT }}
    />
  );
}
