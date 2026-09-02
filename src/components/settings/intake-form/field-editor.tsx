"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShowFieldRuleEditor } from "./condition-rule-editor";
import { FIELD_TYPES, FIELD_TYPE_LABEL } from "./constants";
import type { IntakeField, IntakeFieldType, IntakeFormPage } from "@/lib/intake-forms/types";

function newOptionId(): string {
  return crypto.randomUUID();
}

export function FieldEditor({
  field,
  page,
  onUpdateField,
  onUpdateFields,
  disabled,
}: {
  field: IntakeField;
  page: IntakeFormPage;
  onUpdateField: (patch: Partial<IntakeField>) => void;
  /** For edits that touch a DIFFERENT field too (e.g. clearing a
   *  visibility rule that pointed at a removed option). */
  onUpdateFields: (fields: IntakeField[]) => void;
  disabled: boolean;
}) {
  function addOption() {
    onUpdateField({ options: [...(field.options ?? []), { id: newOptionId(), label: "" }] });
  }
  function updateOption(optionId: string, label: string) {
    onUpdateField({ options: (field.options ?? []).map((o) => (o.id === optionId ? { ...o, label } : o)) });
  }
  function removeOption(optionId: string) {
    onUpdateFields(
      page.fields.map((f) =>
        f.id === field.id
          ? { ...f, options: (f.options ?? []).filter((o) => o.id !== optionId) }
          : f.visibility?.subjectFieldId === field.id && f.visibility?.value === optionId
            ? { ...f, visibility: null }
            : f,
      ),
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Etiqueta de la pregunta</Label>
          <Input
            value={field.label}
            onChange={(e) => onUpdateField({ label: e.target.value })}
            disabled={disabled}
            placeholder="Ej. ¿Cuál es el motivo de tu consulta?"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <select
            value={field.type}
            onChange={(e) => {
              const type = e.target.value as IntakeFieldType;
              onUpdateField({
                type,
                options:
                  type === "single_choice"
                    ? (field.options ?? [
                        { id: newOptionId(), label: "Sí" },
                        { id: newOptionId(), label: "No" },
                      ])
                    : undefined,
              });
            }}
            disabled={disabled}
            className="h-8 w-full rounded-md border border-border bg-muted px-2 text-sm text-foreground disabled:opacity-50"
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {FIELD_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {field.type !== "single_choice" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Texto de ejemplo (opcional)</Label>
          <Input
            value={field.placeholder ?? ""}
            onChange={(e) => onUpdateField({ placeholder: e.target.value || undefined })}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-foreground">
        <Switch checked={field.required} onCheckedChange={(v) => onUpdateField({ required: v })} disabled={disabled} />
        Obligatorio
      </label>

      {field.type === "single_choice" && (
        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs">Opciones</Label>
          {(field.options ?? []).map((option) => (
            <div key={option.id} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Input
                  value={option.label}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                  disabled={disabled}
                  placeholder="Etiqueta de la opción"
                  className="h-8 flex-1 text-sm"
                />
                {!disabled && (field.options?.length ?? 0) > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOption(option.id)}
                    className="rounded-full p-1 text-muted-foreground opacity-60 hover:opacity-100"
                    aria-label="Eliminar opción"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <ShowFieldRuleEditor
                page={page}
                sourceFieldId={field.id}
                optionId={option.id}
                onChange={onUpdateFields}
                disabled={disabled}
              />
            </div>
          ))}
          {!disabled && (
            <Button type="button" variant="outline" size="xs" onClick={addOption}>
              <Plus className="size-3" /> Agregar opción
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
