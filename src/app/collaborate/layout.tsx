// ============================================================
// /collaborate/[token] layout — same shape as /join/[token]'s
// (see that file's comment for the full reasoning): a dedicated,
// minimal shell outside (auth)/(dashboard) since this page must
// render for both anonymous visitors and signed-in users, and
// the same Referrer-Policy hardening (the plaintext token lives
// in the URL path).
// ============================================================

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function CollaborateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {children}
    </div>
  );
}
