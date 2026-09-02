"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getMissingRequiredFieldIds, getVisibleFields, resolveNextPageId } from "@/lib/intake-forms/evaluate";
import type { IntakeField, IntakeFormConfig } from "@/lib/intake-forms/types";

export interface IntakeFormRendererProps {
  config: IntakeFormConfig;
  /** Called once the last resolved page is submitted — answers are
   *  keyed by field id (single_choice answers are option ids, not
   *  labels — the caller/server resolves the human-readable label). */
  onComplete: (answers: Record<string, string>) => void;
  /** Shown as a "Atrás" action on the very first page — omit to hide it there. */
  onBack?: () => void;
  submitLabel?: string;
}

/**
 * One page at a time, single source of truth for both the public
 * booking wizard's intake step and the doctor-facing builder's "Vista
 * previa" panel — same rendering + branching logic either way, so a
 * doctor previewing their form sees exactly what a patient will.
 */
export function IntakeFormRenderer({
  config,
  onComplete,
  onBack,
  submitLabel = "Enviar",
}: IntakeFormRendererProps) {
  const pages = config.pages;
  const [pageStack, setPageStack] = useState<string[]>(() => (pages[0] ? [pages[0].id] : []));
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentPageId = pageStack[pageStack.length - 1];
  const currentPage = pages.find((p) => p.id === currentPageId) ?? null;

  if (!currentPage) {
    return <p className="text-sm text-muted-foreground">Este formulario aún no tiene preguntas.</p>;
  }

  const visibleFields = getVisibleFields(currentPage, answers);
  const missingRequired = getMissingRequiredFieldIds(currentPage, answers);
  const nextPageId = resolveNextPageId(currentPage, answers, pages);
  const isLastPage = nextPageId === null;

  function setAnswer(fieldId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleNext() {
    if (missingRequired.length > 0) return;
    if (nextPageId === null) {
      onComplete(answers);
      return;
    }
    setPageStack((prev) => [...prev, nextPageId]);
  }

  function handleBack() {
    if (pageStack.length > 1) {
      setPageStack((prev) => prev.slice(0, -1));
    } else {
      onBack?.();
    }
  }

  return (
    <div className="space-y-5">
      {currentPage.title ? <h3 className="text-sm font-semibold text-foreground">{currentPage.title}</h3> : null}

      {visibleFields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Esta página no tiene preguntas visibles.</p>
      ) : (
        <div className="space-y-4">
          {visibleFields.map((field) => (
            <IntakeFieldInput
              key={field.id}
              field={field}
              value={answers[field.id] ?? ""}
              onChange={(value) => setAnswer(field.id, value)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        {pageStack.length > 1 || onBack ? (
          <Button type="button" variant="ghost" onClick={handleBack}>
            Atrás
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" onClick={handleNext} disabled={missingRequired.length > 0}>
          {isLastPage ? submitLabel : "Siguiente"}
        </Button>
      </div>
    </div>
  );
}

function IntakeFieldInput({
  field,
  value,
  onChange,
}: {
  field: IntakeField;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `intake-field-${field.id}`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {field.type === "long_text" ? (
        <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
      ) : field.type === "date" ? (
        <Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "number" ? (
        <Input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      ) : field.type === "phone" ? (
        <Input
          id={id}
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      ) : field.type === "email" ? (
        <Input
          id={id}
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      ) : field.type === "single_choice" ? (
        <RadioGroup value={value} onValueChange={(v) => onChange(String(v))}>
          {(field.options ?? []).map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 text-sm text-foreground">
              <RadioGroupItem value={opt.id} />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
      )}
    </div>
  );
}
