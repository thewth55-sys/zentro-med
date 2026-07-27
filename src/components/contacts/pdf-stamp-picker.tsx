"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, PenLine, Signature, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StampField, StampFieldType } from "@/types";

interface PdfStampPickerProps {
  file: File;
  fields: StampField[];
  onChange: (fields: StampField[]) => void;
}

const FIELD_ICON: Record<StampFieldType, typeof Signature> = {
  signature: Signature,
  signer_name: PenLine,
  signed_date: PenLine,
};

const DISPLAY_WIDTH = 460;

/**
 * Renders an uploaded PDF page on a canvas (pdfjs-dist) and lets staff
 * click to place each stamp field (signature/name/date) exactly where
 * it should land at signing time — replaces the earlier numeric %
 * inputs, which gave no visual feedback on where the stamp actually fell.
 */
export function PdfStampPicker({ file, fields, onChange }: PdfStampPickerProps) {
  const t = useTranslations("Contacts.detailView.consentTab.templateDialog");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: DISPLAY_WIDTH, height: DISPLAY_WIDTH * 1.4 });
  const [activeType, setActiveType] = useState<StampFieldType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      if (cancelled) return;
      setPageCount(pdf.numPages);

      const page = await pdf.getPage(Math.min(pageNumber, pdf.numPages));
      if (cancelled) return;
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = DISPLAY_WIDTH / baseViewport.width;
      const viewport = page.getViewport({ scale });
      setCanvasSize({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [file, pageNumber]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!activeType) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    const next = fields.filter((f) => f.type !== activeType);
    next.push({ type: activeType, page: pageNumber, x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) });
    onChange(next);
    setActiveType(null);
  }

  function removeField(type: StampFieldType) {
    onChange(fields.filter((f) => f.type !== type));
  }

  const fieldsOnPage = fields.filter((f) => f.page === pageNumber);
  const fieldTypes: StampFieldType[] = ["signature", "signer_name", "signed_date"];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {fieldTypes.map((type) => {
          const Icon = FIELD_ICON[type];
          const placed = fields.some((f) => f.type === type);
          return (
            <Button
              key={type}
              type="button"
              size="sm"
              variant={activeType === type ? "default" : placed ? "secondary" : "outline"}
              onClick={() => setActiveType(activeType === type ? null : type)}
              className="gap-1 text-xs"
            >
              <Icon className="size-3.5" />
              {t(`field.${type}`)}
              {placed && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeField(type);
                  }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
                >
                  <X className="size-3" />
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {activeType && (
        <p className="text-xs font-medium text-primary">{t("clickToPlace", { field: t(`field.${activeType}`) })}</p>
      )}

      <div className="relative w-full overflow-auto rounded-md border border-border bg-muted/30 p-2">
        <div className="relative mx-auto" style={{ width: canvasSize.width, height: canvasSize.height }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={activeType ? "cursor-crosshair" : "cursor-default"}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/60 text-xs text-muted-foreground">
              {t("renderingPdf")}
            </div>
          )}
          {fieldsOnPage.map((field) => {
            const Icon = FIELD_ICON[field.type];
            return (
              <div
                key={field.type}
                style={{ left: `${field.x * 100}%`, top: `${(1 - field.y) * 100}%` }}
                className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-primary bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground shadow"
              >
                <Icon className="size-3" />
                {t(`field.${field.type}`)}
              </div>
            );
          })}
        </div>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          {t("pageOf", { page: pageNumber, total: pageCount })}
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(pageCount, p + 1))}
            disabled={pageNumber >= pageCount}
            className="disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
