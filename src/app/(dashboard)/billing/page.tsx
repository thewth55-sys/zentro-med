"use client";

import { Plus, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QuoteList } from "@/components/billing/quote-list";
import { InvoiceList } from "@/components/billing/invoice-list";
import { ExpenseList } from "@/components/billing/expense-list";
import { FinancialSummary } from "@/components/billing/financial-summary";
import { PricingCatalog } from "@/components/billing/pricing-catalog";
import { PageHeader } from "@/components/layout/page-header";

const BILLING_TABS = ["summary", "invoices", "quotes", "expenses", "priceList"];

export default function BillingPage() {
  const t = useTranslations("Billing.page");
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = requestedTab && BILLING_TABS.includes(requestedTab) ? requestedTab : "summary";

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wallet}
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button onClick={() => router.push("/billing/invoices/new")}>
            <Plus className="size-4" />
            {t("newInvoice")}
          </Button>
        }
      />

      <Tabs defaultValue={initialTab}>
        <div className="relative -mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="h-auto w-fit shrink-0 gap-0.5 bg-muted p-1">
            <TabsTrigger value="summary" className="shrink-0 px-3.5 py-1.5 text-xs">
              {t("summary")}
            </TabsTrigger>
            <TabsTrigger value="invoices" className="shrink-0 px-3.5 py-1.5 text-xs">
              {t("invoices")}
            </TabsTrigger>
            <TabsTrigger value="quotes" className="shrink-0 px-3.5 py-1.5 text-xs">
              {t("quotes")}
            </TabsTrigger>
            <TabsTrigger value="expenses" className="shrink-0 px-3.5 py-1.5 text-xs">
              {t("expenses")}
            </TabsTrigger>
            <TabsTrigger value="priceList" className="shrink-0 px-3.5 py-1.5 text-xs">
              {t("priceList")}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="summary" className="pt-4">
          <FinancialSummary />
        </TabsContent>
        <TabsContent value="invoices" className="pt-4">
          <InvoiceList />
        </TabsContent>
        <TabsContent value="quotes" className="pt-4">
          <QuoteList />
        </TabsContent>
        <TabsContent value="expenses" className="pt-4">
          <ExpenseList />
        </TabsContent>
        <TabsContent value="priceList" className="pt-4">
          <PricingCatalog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
