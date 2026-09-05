'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { computeLineTotal, type DiscountType } from '@/lib/billing/totals';
import type { EditableLine } from './billing-line-items-editor';

interface PickableItem {
  id: string;
  quote_id: string;
  quote_number: string | null;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_id: string | null;
  discount_type: DiscountType;
  discount_value: number;
  odontogram_tooth_id: string | null;
  odontogram_tooth: { tooth_number: number } | null;
  phase: { name: string } | null;
}

/**
 * "Traer del plan de tratamiento" — trae líneas puntuales (no la
 * cotización completa) de los planes ACEPTADOS de un paciente hacia
 * la factura que se está armando. Cada línea conserva diente/fase y
 * queda ligada a `source_quote_item_id` para no poder traerse dos
 * veces y para marcarse "hecha" en el plan cuando la factura se emita.
 */
export function PullFromPlanDialog({
  open,
  onOpenChange,
  contactId,
  currency,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  currency: string;
  onAdd: (lines: EditableLine[]) => void;
}) {
  const t = useTranslations('Billing.pullFromPlan');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PickableItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(new Set());
    (async () => {
      try {
        const res = await fetch(`/api/billing/quotes/pickable-items?contact_id=${contactId}`);
        const data = await res.json();
        setItems((data.items ?? []) as PickableItem[]);
      } catch (err) {
        console.error('Load pickable plan items error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, contactId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const lines: EditableLine[] = items
      .filter((item) => selected.has(item.id))
      .map((item) => ({
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_id: item.tax_id,
        discount_type: item.discount_type,
        discount_value: item.discount_value,
        odontogram_tooth_id: item.odontogram_tooth_id,
        tooth_number: item.odontogram_tooth?.tooth_number ?? null,
        phase_label: item.phase?.name ?? null,
        source_quote_item_id: item.id,
      }));
    onAdd(lines);
    onOpenChange(false);
  }

  const currencyFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="max-h-80 space-y-1.5 overflow-y-auto">
            {items.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-2.5 hover:border-primary/40"
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 size-3.5 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.odontogram_tooth?.tooth_number ? t('tooth', { tooth: item.odontogram_tooth.tooth_number }) : null}
                    {item.odontogram_tooth?.tooth_number && item.phase?.name ? ' · ' : null}
                    {item.phase?.name ?? (!item.odontogram_tooth?.tooth_number ? t('noPhase') : null)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-foreground">
                  {currencyFormatter.format(
                    computeLineTotal(item.quantity, item.unit_price, item.discount_type, item.discount_value)
                  )}
                </span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="button" onClick={handleAdd} disabled={selected.size === 0}>
            {t('addSelected', { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
