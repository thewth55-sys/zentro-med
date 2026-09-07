"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";

import { InvoiceDetail } from "@/components/billing/invoice-detail";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const autoOpenPayment = searchParams.get("action") === "payment";

  return (
    <div className="mx-auto max-w-6xl">
      <InvoiceDetail invoiceId={id} autoOpenPayment={autoOpenPayment} />
    </div>
  );
}
