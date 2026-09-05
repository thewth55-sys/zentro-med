"use client";

import { BarChart3, Boxes, FileText, Landmark, Plus, Receipt, Tag, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QuoteList } from "@/components/billing/quote-list";
import { InvoiceList } from "@/components/billing/invoice-list";
import { ExpenseList } from "@/components/billing/expense-list";
import { BankAccountList } from "@/components/billing/bank-account-list";
import { InventoryList } from "@/components/billing/inventory-list";
import { FinancialSummary } from "@/components/billing/financial-summary";
import { ProductManager } from "@/components/settings/product-manager";
import { PageHeader } from "@/components/layout/page-header";

const BILLING_TABS = ["summary", "invoices", "quotes", "expenses", "bankAccounts", "inventory", "priceList"];

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
        <div className="relative -mx-1">
          <TabsList
            variant="line"
            className="group-data-horizontal/tabs:h-auto w-full justify-start gap-1 overflow-x-auto border-b border-border px-1 pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <TabsTrigger value="summary" className="h-auto shrink-0 gap-1.5 px-3 py-2.5 text-muted-foreground data-active:text-primary">
              <BarChart3 className="size-4" />
              {t("summary")}
            </TabsTrigger>
            <TabsTrigger value="invoices" className="h-auto shrink-0 gap-1.5 px-3 py-2.5 text-muted-foreground data-active:text-primary">
              <Receipt className="size-4" />
              {t("invoices")}
            </TabsTrigger>
            <TabsTrigger value="quotes" className="h-auto shrink-0 gap-1.5 px-3 py-2.5 text-muted-foreground data-active:text-primary">
              <FileText className="size-4" />
              {t("quotes")}
            </TabsTrigger>
            <TabsTrigger value="expenses" className="h-auto shrink-0 gap-1.5 px-3 py-2.5 text-muted-foreground data-active:text-primary">
              <Wallet className="size-4" />
              {t("expenses")}
            </TabsTrigger>
            <TabsTrigger value="bankAccounts" className="h-auto shrink-0 gap-1.5 px-3 py-2.5 text-muted-foreground data-active:text-primary">
              <Landmark className="size-4" />
              {t("bankAccounts")}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="h-auto shrink-0 gap-1.5 px-3 py-2.5 text-muted-foreground data-active:text-primary">
              <Boxes className="size-4" />
              {t("inventory")}
            </TabsTrigger>
            <TabsTrigger value="priceList" className="h-auto shrink-0 gap-1.5 px-3 py-2.5 text-muted-foreground data-active:text-primary">
              <Tag className="size-4" />
              {t("priceList")}
            </TabsTrigger>
          </TabsList>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
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
        <TabsContent value="bankAccounts" className="pt-4">
          <BankAccountList />
        </TabsContent>
        <TabsContent value="inventory" className="pt-4">
          <InventoryList />
        </TabsContent>
        <TabsContent value="priceList" className="pt-4">
          <ProductManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
