import { redirect } from "next/navigation";

import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/account";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

// Server-side gate for the whole /admin surface — mirrors the
// UnauthorizedError/ForbiddenError split requirePlatformAdmin()
// throws: no session at all sends the visitor to /login, a real
// session that just isn't platform staff sends them back to their
// own dashboard rather than a bare 403 page.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requirePlatformAdmin();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/login");
    if (err instanceof ForbiddenError) redirect("/dashboard");
    throw err;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden px-8 py-8">{children}</main>
    </div>
  );
}
