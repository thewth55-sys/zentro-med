"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, PenLine, Plus, Signature, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  custom_text: PenLine,
};

const DISPLAY_WIDTH = 460;
const FIXED_TYPES: StampFieldType[] = ["signature", "signer_name", "signed_date"];

interface Armed {
  /** Existing field id being repositioned, or a fresh id for a field not yet placed. */
  id: string;
  type: StampFieldType;
  label?: string;
}

/**
 * Renders an uploaded PDF page on a canvas (pdfjs-dist) and lets staff
 * click to place stamp fields (signature/name/date, plus any number of
 * custom text fields) exactly where they should land at signing time.
 * Placed fields are also directly draggable — staff commonly misjudge
 * the first click, so repositioning shouldn't require re-arming the
 * toolbar button each time.
 */
export function PdfStampPicker({ file, fields, onChange }: PdfStampPickerProps) {
  const t = useTranslations("Contacts.detailView.consentTab.templateDialog");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: DISPLAY_WIDTH, height: DISPLAY_WIDTH * 1.4 });
  const [armed, setArmed] = useState<Armed | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customLabelDraft, setCustomLabelDraft] = useState("");

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

  function pointToFraction(clientX: number, clientY: number) {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height;
    return { x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) };
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!armed) return;
    const { x, y } = pointToFraction(e.clientX, e.clientY);
    const next = fields.filter((f) => f.id !== armed.id);
    next.push({ id: armed.id, type: armed.type, label: armed.label, page: pageNumber, x, y });
    onChange(next);
    setArmed(null);
  }

  function armExisting(field: StampField) {
    setArmed({ id: field.id, type: field.type, label: field.label });
  }

  function armFixedType(type: StampFieldType) {
    if (armed?.id === type) {
      setArmed(null);
      return;
    }
    const existing = fields.find((f) => f.type === type);
    setArmed({ id: existing?.id ?? type, type });
  }

  function startAddingCustom() {
    setAddingCustom(true);
    setCustomLabelDraft("");
  }

  function confirmAddCustom() {
    const label = customLabelDraft.trim();
    if (!label) return;
    setArmed({ id: crypto.randomUUID(), type: "custom_text", label });
    setAddingCustom(false);
    setCustomLabelDraft("");
  }

  function removeField(id: string) {
    onChange(fields.filter((f) => f.id !== id));
    if (armed?.id === id) setArmed(null);
  }

  function handlePinPointerDown(e: React.PointerEvent, fieldId: string) {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingId(fieldId);
  }

  function handlePinPointerMove(e: React.PointerEvent, field: StampField) {
    if (draggingId !== field.id) return;
    const { x, y } = pointToFraction(e.clientX, e.clientY);
    onChange(fields.map((f) => (f.id === field.id ? { ...f, x, y } : f)));
  }

  function handlePinPointerUp() {
    setDraggingId(null);
  }

  const fieldsOnPage = fields.filter((f) => f.page === pageNumber);
  const customFields = fields.filter((f) => f.type === "custom_text");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {FIXED_TYPES.map((type) => {
          const Icon = FIELD_ICON[type];
          const placed = fields.some((f) => f.type === type);
          return (
            <Button
              key={type}
              type="button"
              size="sm"
              variant={armed?.type === type ? "default" : placed ? "secondary" : "outline"}
              onClick={() => armFixedType(type)}
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
                    const existing = fields.find((f) => f.type === type);
                    if (existing) removeField(existing.id);
                  }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
                >
                  <X className="size-3" />
                </span>
              )}
            </Button>
          );
        })}
        {customFields.map((field) => (
          <Button
            key={field.id}
            type="button"
            size="sm"
            variant={armed?.id === field.id ? "default" : "secondary"}
            onClick={() => armExisting(field)}
            className="gap-1 text-xs"
          >
            <PenLine className="size-3.5" />
            {field.label}
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                removeField(field.id);
              }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
            >
              <X className="size-3" />
            </span>
          </Button>
        ))}
        {addingCustom ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={customLabelDraft}
              onChange={(e) => setCustomLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmAddCustom();
                if (e.key === "Escape") setAddingCustom(false);
              }}
              placeholder={t("customFieldLabelPlaceholder")}
              className="h-7 w-36 text-xs"
            />
            <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={confirmAddCustom}>
              {t("add")}
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={startAddingCustom} className="gap-1 text-xs">
            <Plus className="size-3.5" />
            {t("addCustomField")}
          </Button>
        )}
      </div>

      {armed && (
        <p className="text-xs font-medium text-primary">
          {t("clickToPlace", { field: armed.label ?? t(`field.${armed.type}`) })}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">{t("dragToReposition")}</p>

      <div className="relative w-full overflow-auto rounded-md border border-border bg-muted/30 p-2">
        <div ref={containerRef} className="relative mx-auto" style={{ width: canvasSize.width, height: canvasSize.height }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={armed ? "cursor-crosshair" : "cursor-default"}
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
                key={field.id}
                onPointerDown={(e) => handlePinPointerDown(e, field.id)}
                onPointerMove={(e) => handlePinPointerMove(e, field)}
                onPointerUp={handlePinPointerUp}
                style={{ left: `${field.x * 100}%`, top: `${(1 - field.y) * 100}%` }}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab items-center gap-1 rounded-full border border-primary bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground shadow active:cursor-grabbing ${
                  draggingId === field.id ? "z-10 opacity-80" : ""
                }`}
              >
                <Icon className="size-3" />
                {field.type === "custom_text" ? field.label : t(`field.${field.type}`)}
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
