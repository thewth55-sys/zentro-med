import { redirect } from "next/navigation";

// This used to be a separate CRM-only-focused landing variant with its
// own copy in ./landing-content.ts. The root "/" landing now covers
// the same "Zentro CRM" pitch directly (see src/app/landing-content.ts
// and src/app/page.tsx's updated metadata), so /crm just redirects
// there instead of serving near-duplicate content.
export default function CrmLandingPage() {
  redirect("/");
}
