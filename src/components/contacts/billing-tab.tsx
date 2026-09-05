"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QuoteList } from "@/components/billing/quote-list";
import { InvoiceList } from "@/components/billing/invoice-list";
import { AccountStatusPanel } from "@/components/billing/account-status-panel";

interface BillingTabProps {
  contactId: string;
  currency: string;
  /** Opens the same WhatsApp template picker as the patient header's
   *  "Enviar plantilla" button — a payment reminder is still a
   *  business-initiated WhatsApp message, so it has to go through an
   *  approved template like any other outbound message here. */
  onSendReminder: () => void;
}

/**
 * Patient's billing history — quotes and invoices scoped to this
 * contact, reusing the same QuoteList/InvoiceList used by the
 * standalone /billing module (just filtered by contact_id), plus the
 * account-status summary (saldo/facturado/cobrado/plan de pagos).
 */
export function BillingTab({ contactId, currency, onSendReminder }: BillingTabProps) {
  const t = useTranslations("Contacts.detailView.billingTab");
  const [autoOpenInvoiceId, setAutoOpenInvoiceId] = useState<string | null>(null);

  return (
    <Tabs defaultValue="invoices">
      <TabsList className="bg-muted/50 border-b border-border">
        <TabsTrigger value="invoices" className="data-active:bg-muted data-active:text-primary text-muted-foreground">
          {t("invoices")}
        </TabsTrigger>
        <TabsTrigger value="quotes" className="data-active:bg-muted data-active:text-primary text-muted-foreground">
          {t("quotes")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="invoices" className="pt-3">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <InvoiceList
            contactId={contactId}
            autoOpenInvoiceId={autoOpenInvoiceId}
            onAutoOpenHandled={() => setAutoOpenInvoiceId(null)}
          />
          <AccountStatusPanel
            contactId={contactId}
            currency={currency}
            onRequestPayment={setAutoOpenInvoiceId}
            onSendReminder={onSendReminder}
          />
        </div>
      </TabsContent>
      <TabsContent value="quotes" className="pt-3">
        <QuoteList contactId={contactId} />
      </TabsContent>
    </Tabs>
  );
}
