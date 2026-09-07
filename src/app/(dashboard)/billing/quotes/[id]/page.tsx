"use client";

import { use } from "react";

import { QuoteDetail } from "@/components/billing/quote-detail";

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="mx-auto max-w-6xl">
      <QuoteDetail quoteId={id} />
    </div>
  );
}
