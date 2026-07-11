"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Payment } from "@/types";

interface PaymentListProps {
  payments: Payment[];
  currency: string;
  onDelete: (paymentId: string) => void;
  deletingId: string | null;
  disabled?: boolean;
}

export function PaymentList({ payments, currency, onDelete, deletingId, disabled }: PaymentListProps) {
  const t = useTranslations("Billing.payments");
  const currencyFormatter = new Intl.NumberFormat(undefined, { style: "currency", currency });
  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

  if (payments.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="space-y-1.5">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"
        >
          <div>
            <span className="font-medium text-foreground">{currencyFormatter.format(payment.amount)}</span>
            <span className="ml-2 text-muted-foreground">
              {t(`methods.${payment.method}`)} · {dateFormatter.format(new Date(payment.paid_at))}
            </span>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => onDelete(payment.id)}
              disabled={deletingId === payment.id}
              aria-label={t("delete")}
              className="text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              {deletingId === payment.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
