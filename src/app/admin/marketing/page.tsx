import { redirect } from "next/navigation";
import { requireStaffRole } from "@/lib/auth/platform-admin";
import { ForbiddenError } from "@/lib/auth/account";

import AdminMarketingAccountsList from "@/components/admin/admin-marketing-accounts-list";

export default async function AdminMarketingPage() {
  try {
    await requireStaffRole(["marketing"]);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      redirect("/admin");
    }
    throw err; // Re-throw other types of errors
  }

  return (
    <div>
      <h1>Marketing</h1>
      <p>Administra el acceso a las funciones de marketing para las cuentas.</p>
      <AdminMarketingAccountsList />
    </div>
  );
}