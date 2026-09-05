"use client";

import { Inbox } from "lucide-react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";
import { ComingSoonState } from "@/components/marketing/coming-soon-state";

export default function MarketingRequestsPage() {
  const t = useTranslations("Marketing.requests");
  return (
    <div className="space-y-6">
      <PageHeader icon={Inbox} title={t("title")} description={t("description")} />
      <ComingSoonState icon={Inbox} description={t("comingSoon")} />
    </div>
  );
}
