"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Opens the in-app "Centro de ayuda" screen (src/app/(dashboard)/help)
 * — a ticket form + status list backed by the Zoho Desk API, plus a
 * link out to the Zoho Desk knowledge base from there. Distinct from
 * the Zoho chat widget already floating on every page
 * (components/zoho-desk-widget.tsx). Same 40×40 icon-button hit
 * target as the other header icons (search, notifications).
 */
export function HelpButton({ className }: { className?: string }) {
  const t = useTranslations("Sidebar");

  return (
    <Link
      href="/help"
      aria-label={t("menuHelp")}
      title={t("menuHelp")}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <HelpCircle className="h-5 w-5" />
    </Link>
  );
}
