"use client";

// ============================================================
// NavOrderEditor — Settings → Tu perfil. Lets each user drag-reorder
// their own sidebar nav (src/lib/nav-items.ts is the shared source of
// truth for the item list, also consumed by sidebar.tsx). A
// per-person preference, not an account setting — see
// 048_profile_nav_order.sql.
//
// Panel and Zen are pinned (not reorderable, matching sidebar.tsx's
// own elevated treatment for Zen) — everything else is grouped into
// Atención / Operación / Configuración, each its own independent drag
// list (a separate DndContext per group) so an item can never be
// dragged across a group boundary, matching how the real sidebar
// renders fixed sections. `applyNavOrder` (nav-items.ts) already knows
// how to re-bucket a saved flat order by group, so persisting is still
// just one flat array of hrefs — no storage-shape change.
// ============================================================

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ListOrdered, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { navItems, applyNavOrder, NAV_GROUP_ORDER, type NavItem, type NavGroup } from "@/lib/nav-items";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function splitByGroup(ordered: NavItem[]): Record<NavGroup, NavItem[]> {
  return {
    atencion: ordered.filter((i) => i.group === "atencion"),
    operacion: ordered.filter((i) => i.group === "operacion"),
    configuracion: ordered.filter((i) => i.group === "configuracion"),
  };
}

const defaultGroups = splitByGroup(navItems);
const pinnedItems = navItems.filter((i) => !i.group);

export function NavOrderEditor() {
  const t = useTranslations("Settings.profile");
  const tNav = useTranslations("Sidebar");
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();

  const [groups, setGroups] = useState<Record<NavGroup, NavItem[]>>(defaultGroups);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGroups(splitByGroup(applyNavOrder(navItems, profile?.nav_order)));
  }, [profile?.nav_order]);

  // Both sensors so the drag handle is reliable on mouse (PointerSensor,
  // 5px move to activate — avoids swallowing plain clicks) and on
  // touch (TouchSensor, a short press-hold instead of a distance
  // threshold — a finger drifts more than 5px just resting on glass,
  // so a distance constraint alone makes touch drag flaky).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const isDefaultOrder = NAV_GROUP_ORDER.every((g) =>
    groups[g].every((item, i) => item.href === defaultGroups[g][i]?.href),
  );

  function handleReorder(group: NavGroup) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setGroups((prev) => {
        const list = prev[group];
        const oldIndex = list.findIndex((i) => i.href === active.id);
        const newIndex = list.findIndex((i) => i.href === over.id);
        if (oldIndex < 0 || newIndex < 0) return prev;
        return { ...prev, [group]: arrayMove(list, oldIndex, newIndex) };
      });
    };
  }

  async function persist(nextGroups: Record<NavGroup, NavItem[]> | null) {
    if (!user) return;
    setSaving(true);
    try {
      const order = nextGroups
        ? [
            ...pinnedItems.map((i) => i.href),
            ...NAV_GROUP_ORDER.flatMap((g) => nextGroups[g].map((i) => i.href)),
          ]
        : null;
      const { error } = await supabase
        .from("profiles")
        .update({ nav_order: order })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(t("navOrderSaved"));
    } catch (err) {
      console.error("Save nav order error:", err);
      toast.error(t("navOrderSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ListOrdered className="size-4 text-primary" />
          {t("navOrderTitle")}
        </CardTitle>
        <CardDescription className="text-muted-foreground">{t("navOrderDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          {pinnedItems.map((item) => (
            <div
              key={item.href}
              className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-2.5 py-2 text-muted-foreground"
            >
              <item.icon className="size-4" />
              <span className="text-sm">{tNav(item.labelKey)}</span>
            </div>
          ))}
        </div>

        {NAV_GROUP_ORDER.map((group) => (
          <div key={group} className="space-y-1.5">
            <p className="px-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              {tNav(`group_${group}`)}
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder(group)}>
              <SortableContext items={groups[group].map((i) => i.href)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {groups[group].map((item) => (
                    <SortableNavRow
                      key={item.href}
                      item={item}
                      label={tNav(item.labelKey)}
                      dragLabel={t("navOrderDrag")}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={() => persist(groups)}
            disabled={saving}
            className="bg-primary text-xs text-primary-foreground hover:bg-primary/90"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {t("navOrderSave")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setGroups(defaultGroups);
              void persist(null);
            }}
            disabled={saving || isDefaultOrder}
            className="text-xs"
          >
            <RotateCcw className="size-3.5" />
            {t("navOrderReset")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableNavRow({ item, label, dragLabel }: { item: NavItem; label: string; dragLabel: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.href,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={dragLabel}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <item.icon className="size-4 text-muted-foreground" />
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}
