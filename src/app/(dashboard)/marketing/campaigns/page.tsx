"use client";

import { Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";
import { ComingSoonState } from "@/components/marketing/coming-soon-state";

export default function MarketingCampaignsPage() {
  const t = useTranslations("Marketing.campaigns");
  return (
    <div className="space-y-6">
      <PageHeader icon={Megaphone} title={t("title")} description={t("description")} />
      <ComingSoonState icon={Megaphone} description={t("comingSoon")} />
    </div>
  );
}
