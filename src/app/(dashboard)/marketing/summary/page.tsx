"use client";

import { BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";
import { ComingSoonState } from "@/components/marketing/coming-soon-state";

export default function MarketingSummaryPage() {
  const t = useTranslations("Marketing.summary");
  return (
    <div className="space-y-6">
      <PageHeader icon={BarChart3} title={t("title")} description={t("description")} />
      <ComingSoonState icon={BarChart3} description={t("comingSoon")} />
    </div>
  );
}
