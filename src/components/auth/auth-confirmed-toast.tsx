"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

/**
 * Fires a "your account is confirmed" toast when the URL carries
 * `?auth=confirmed` — set by the signup page's `emailRedirectTo` (see
 * its comment) so it only fires for signup confirmation, never for
 * the password-reset or impersonation links that share the same
 * /auth/callback exchange. Strips the param afterward so a refresh
 * doesn't re-fire it.
 */
export function AuthConfirmedToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Auth");

  useEffect(() => {
    if (searchParams.get("auth") !== "confirmed") return;
    toast.success(t("emailConfirmed"));
    const params = new URLSearchParams(searchParams);
    params.delete("auth");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
