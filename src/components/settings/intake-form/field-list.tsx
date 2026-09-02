"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldEditor } from "./field-editor";
import { PageJumpRulesEditor } from "./condition-rule-editor";
import { FIELD_TYPES, FIELD_TYPE_LABEL } from "./constants";
import type { IntakeField, IntakeFieldType, IntakeFormPage } from "@/lib/intake-forms/types";

function newFieldId(): string {
  return crypto.randomUUID();
}

function emptyField(type: IntakeFieldType): IntakeField {
  return {
    id: newFieldId(),
    type,
    label: "",
    required: false,
    ...(type === "single_choice"
      ? { options: [{ id: newFieldId(), label: "Sí" }, { id: newFieldId(), label: "No" }] }
      : {}),
  };
}

export function FieldList({
  page,
  allPages,
  onChangeFields,
  onChangeJumpRules,
  disabled,
}: {
  page: IntakeFormPage;
  allPages: IntakeFormPage[];
  onChangeFields: (fields: IntakeField[]) => void;
  onChangeJumpRules: (rules: IntakeFormPage["jumpRules"]) => void;
  disabled: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = page.fields.findIndex((f) => f.id === active.id);
    const newIndex = page.fields.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChangeFields(arrayMove(page.fields, oldIndex, newIndex));
  }

  function addField(type: IntakeFieldType) {
    const field = emptyField(type);
    onChangeFields([...page.fields, field]);
    setExpandedId(field.id);
    setAddMenuOpen(false);
  }

  function removeField(fieldId: string) {
    const next = page.fields
      .filter((f) => f.id !== fieldId)
      .map((f) => (f.visibility?.subjectFieldId === fieldId ? { ...f, visibility: null } : f));
    onChangeFields(next);
    onChangeJumpRules(page.jumpRules.filter((r) => r.subjectFieldId !== fieldId));
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      {page.fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Esta página no tiene preguntas todavía.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={page.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {page.fields.map((field) => (
                <SortableFieldRow
                  key={field.id}
                  field={field}
                  page={page}
                  expanded={expandedId === field.id}
                  onToggle={() => setExpandedId((prev) => (prev === field.id ? null : field.id))}
                  onRemove={() => removeField(field.id)}
                  onUpdateField={(patch) =>
                    onChangeFields(page.fields.map((f) => (f.id === field.id ? { ...f, ...patch } : f)))
                  }
                  onUpdateFields={onChangeFields}
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!disabled && (
        <div className="relative">
          <Button type="button" variant="outline" size="sm" onClick={() => setAddMenuOpen((v) => !v)}>
            <Plus className="size-3.5" /> Agregar pregunta
          </Button>
          {addMenuOpen && (
            <div className="absolute z-10 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
              {FIELD_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addField(type)}
                  className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-muted"
                >
                  {FIELD_TYPE_LABEL[type]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <PageJumpRulesEditor page={page} allPages={allPages} onChange={onChangeJumpRules} disabled={disabled} />
      </div>
    </div>
  );
}

function SortableFieldRow({
  field,
  page,
  expanded,
  onToggle,
  onRemove,
  onUpdateField,
  onUpdateFields,
  disabled,
}: {
  field: IntakeField;
  page: IntakeFormPage;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateField: (patch: Partial<IntakeField>) => void;
  onUpdateFields: (fields: IntakeField[]) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-muted/30">
      <div className="flex items-center gap-2 px-2.5 py-2">
        {!disabled && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Reordenar pregunta"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <button type="button" onClick={onToggle} className="flex flex-1 items-center gap-2 text-left">
          <span className="text-sm text-foreground">{field.label || "(sin título)"}</span>
          <span className="text-xs text-muted-foreground">
            — {FIELD_TYPE_LABEL[field.type]}
            {field.required ? " · obligatorio" : ""}
          </span>
        </button>
        {expanded ? (
          <ChevronUp className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        )}
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full p-0.5 text-muted-foreground opacity-60 hover:opacity-100"
            aria-label="Eliminar pregunta"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="border-t border-border p-3">
          <FieldEditor
            field={field}
            page={page}
            onUpdateField={onUpdateField}
            onUpdateFields={onUpdateFields}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
