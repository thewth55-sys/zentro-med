"use client";

import { AtSign } from "lucide-react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";
import { ComingSoonState } from "@/components/marketing/coming-soon-state";

export default function MarketingSocialPage() {
  const t = useTranslations("Marketing.social");
  return (
    <div className="space-y-6">
      <PageHeader icon={AtSign} title={t("title")} description={t("description")} />
      <ComingSoonState icon={AtSign} description={t("comingSoon")} />
    </div>
  );
}
