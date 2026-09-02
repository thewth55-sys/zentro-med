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
import { GripVertical, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IntakeFormPage } from "@/lib/intake-forms/types";

export function PageList({
  pages,
  selectedPageId,
  onSelect,
  onReorder,
  onAdd,
  onRename,
  onRemove,
  disabled,
}: {
  pages: IntakeFormPage[];
  selectedPageId: string | null;
  onSelect: (id: string) => void;
  onReorder: (pages: IntakeFormPage[]) => void;
  onAdd: () => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(pages, oldIndex, newIndex));
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {pages.map((page, index) => (
              <SortablePageRow
                key={page.id}
                page={page}
                index={index}
                selected={page.id === selectedPageId}
                onSelect={() => onSelect(page.id)}
                onRename={(title) => onRename(page.id, title)}
                onRemove={() => onRemove(page.id)}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={onAdd} className="w-full">
          <Plus className="size-3.5" /> Agregar página
        </Button>
      )}
    </div>
  );
}

function SortablePageRow({
  page,
  index,
  selected,
  onSelect,
  onRename,
  onRemove,
  disabled,
}: {
  page: IntakeFormPage;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.title);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${
        selected ? "border-primary bg-primary/5" : "border-border bg-muted/40"
      }`}
    >
      {!disabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Reordenar página"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      {editing ? (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            onRename(draft.trim() || `Página ${index + 1}`);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-7 flex-1 text-xs"
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={() => {
            if (!disabled) {
              setDraft(page.title);
              setEditing(true);
            }
          }}
          className="flex-1 truncate text-left text-xs text-foreground"
        >
          {page.title || `Página ${index + 1}`}
        </button>
      )}
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 text-muted-foreground opacity-60 hover:opacity-100"
          aria-label="Eliminar página"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
