"use client";

import { Newspaper } from "lucide-react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";
import { ComingSoonState } from "@/components/marketing/coming-soon-state";

export default function MarketingContentPage() {
  const t = useTranslations("Marketing.content");
  return (
    <div className="space-y-6">
      <PageHeader icon={Newspaper} title={t("title")} description={t("description")} />
      <ComingSoonState icon={Newspaper} description={t("comingSoon")} />
    </div>
  );
}
