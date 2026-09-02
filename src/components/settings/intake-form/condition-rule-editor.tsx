"use client";

import { Eye, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IntakeField, IntakeFormPage } from "@/lib/intake-forms/types";

/**
 * "Cuando [opción] entonces mostrar [campo destino]" — rendered
 * directly beneath the option it belongs to (in field-editor.tsx),
 * matching the reference builder's own placement instead of a
 * separate rules panel. The rule is stored on the TARGET field's
 * `visibility`, not on the option — this component just gives the
 * admin a way to point at/away-from a target without editing that
 * other field directly.
 */
export function ShowFieldRuleEditor({
  page,
  sourceFieldId,
  optionId,
  onChange,
  disabled,
}: {
  page: IntakeFormPage;
  sourceFieldId: string;
  optionId: string;
  onChange: (fields: IntakeField[]) => void;
  disabled: boolean;
}) {
  const candidates = page.fields.filter((f) => f.id !== sourceFieldId);
  if (candidates.length === 0) return null;

  const currentTarget = page.fields.find(
    (f) => f.visibility?.subjectFieldId === sourceFieldId && f.visibility?.value === optionId,
  );

  function setTarget(targetId: string) {
    const updated = page.fields.map((f) => {
      const isCurrentTarget =
        f.visibility?.subjectFieldId === sourceFieldId && f.visibility?.value === optionId;
      if (isCurrentTarget && f.id !== targetId) return { ...f, visibility: null };
      if (targetId && f.id === targetId) {
        return { ...f, visibility: { subjectFieldId: sourceFieldId, operator: "equals" as const, value: optionId } };
      }
      return f;
    });
    onChange(updated);
  }

  return (
    <div className="ml-1 flex flex-wrap items-center gap-1.5 rounded-md border border-dashed border-border bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
      <Eye className="size-3 shrink-0" />
      <span>Cuando se elige esta opción, mostrar</span>
      <select
        value={currentTarget?.id ?? ""}
        onChange={(e) => setTarget(e.target.value)}
        disabled={disabled}
        className="h-6 rounded border border-border bg-background px-1.5 text-xs text-foreground disabled:opacity-50"
      >
        <option value="">(ninguna)</option>
        {candidates.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label || "(sin título)"}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * "Cuando [campo] es [valor] entonces saltar a [página]" — one page
 * can carry several of these (first match wins, evaluated in the
 * order shown); no match falls through to the next page in order.
 */
export function PageJumpRulesEditor({
  page,
  allPages,
  onChange,
  disabled,
}: {
  page: IntakeFormPage;
  allPages: IntakeFormPage[];
  onChange: (rules: IntakeFormPage["jumpRules"]) => void;
  disabled: boolean;
}) {
  const otherPages = allPages.filter((p) => p.id !== page.id);

  function addRule() {
    const firstField = page.fields[0];
    const firstTarget = otherPages[0];
    if (!firstField || !firstTarget) return;
    onChange([
      ...page.jumpRules,
      { subjectFieldId: firstField.id, operator: "equals", value: "", targetPageId: firstTarget.id },
    ]);
  }
  function updateRule(index: number, patch: Partial<IntakeFormPage["jumpRules"][number]>) {
    onChange(page.jumpRules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeRule(index: number) {
    onChange(page.jumpRules.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground">Reglas de salto de página</p>
        {!disabled && page.fields.length > 0 && otherPages.length > 0 && (
          <Button type="button" variant="outline" size="xs" onClick={addRule}>
            <Plus className="size-3" /> Regla
          </Button>
        )}
      </div>
      {page.jumpRules.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sin reglas — al terminar esta página se pasa a la siguiente en orden.
        </p>
      ) : (
        page.jumpRules.map((rule, index) => {
          const subjectField = page.fields.find((f) => f.id === rule.subjectFieldId);
          return (
            <div
              key={index}
              className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs"
            >
              <span className="text-muted-foreground">Cuando</span>
              <select
                value={rule.subjectFieldId}
                onChange={(e) => updateRule(index, { subjectFieldId: e.target.value, value: "" })}
                disabled={disabled}
                className="h-6 rounded border border-border bg-background px-1.5 text-foreground disabled:opacity-50"
              >
                {page.fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label || "(sin título)"}
                  </option>
                ))}
              </select>
              <span className="text-muted-foreground">es</span>
              {subjectField?.type === "single_choice" ? (
                <select
                  value={rule.value ?? ""}
                  onChange={(e) => updateRule(index, { value: e.target.value })}
                  disabled={disabled}
                  className="h-6 rounded border border-border bg-background px-1.5 text-foreground disabled:opacity-50"
                >
                  <option value="">(elige)</option>
                  {(subjectField.options ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={rule.value ?? ""}
                  onChange={(e) => updateRule(index, { value: e.target.value })}
                  disabled={disabled}
                  className="h-6 w-24 text-xs"
                />
              )}
              <span className="text-muted-foreground">entonces saltar a</span>
              <select
                value={rule.targetPageId}
                onChange={(e) => updateRule(index, { targetPageId: e.target.value })}
                disabled={disabled}
                className="h-6 rounded border border-border bg-background px-1.5 text-foreground disabled:opacity-50"
              >
                {otherPages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title || "(sin título)"}
                  </option>
                ))}
              </select>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  className="rounded-full p-0.5 text-muted-foreground opacity-60 hover:opacity-100"
                  aria-label="Eliminar regla"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
