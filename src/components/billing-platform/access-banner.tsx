"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useHasAccess } from "@/hooks/use-has-access";

/**
 * Persistent banner shown once a trial has lapsed or a subscription
 * is fully canceled — the account keeps its data (nothing is
 * deleted) but is nudged toward Settings → Suscripción on every
 * screen until it's resolved.
 */
export function AccessBanner() {
  const { profileLoading } = useAuth();
  const hasAccess = useHasAccess();

  if (profileLoading || hasAccess) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
      <AlertTriangle className="size-4 shrink-0" />
      <span>Tu prueba terminó — estás en modo de solo lectura.</span>
      <Link href="/settings?tab=billing-platform" className="font-medium underline underline-offset-2 hover:no-underline">
        Activar un plan
      </Link>
    </div>
  );
}
