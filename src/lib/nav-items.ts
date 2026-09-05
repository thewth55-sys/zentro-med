// ============================================================
// Shared main-nav item list — the default order and metadata for the
// sidebar's top nav section. Extracted out of sidebar.tsx so the
// Settings → Tu perfil reorder editor (nav-order-editor.tsx) can
// render the exact same items without duplicating this list and
// drifting from it.
//
// `bottomNavItems` (Settings, Admin) stays defined in sidebar.tsx —
// those are pinned, not part of the user-reorderable set.
// ============================================================

import {
  AtSign,
  BarChart3,
  Bot,
  Calendar,
  CreditCard,
  Inbox,
  LayoutGrid,
  Link2,
  Megaphone,
  MessageCircle,
  Newspaper,
  Radio,
  Share2,
  Sparkles,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { GatedFeature } from "@/lib/billing-platform/features";

/** Fixed section a nav item belongs to — drives both the sidebar's group
 *  headers and how far `applyNavOrder` lets a saved order move an item
 *  (never across a group boundary). Items with no `group` (Panel, Zen)
 *  are pinned above every group and never reorderable. */
export type NavGroup = "atencion" | "operacion" | "marketing" | "configuracion";

/** Order the groups render in — also the canonical iteration order for
 *  `applyNavOrder`. */
export const NAV_GROUP_ORDER: NavGroup[] = ["atencion", "operacion", "marketing", "configuracion"];

export interface NavItem {
  href: string;
  labelKey: string;
  /** Most items use a lucide icon; a couple (WhatsApp) use a custom SVG with the same call shape. */
  icon: LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;
  /**
   * When true, the nav row renders a small "Beta" chip after the label.
   * Purely informational — doesn't affect routing or access.
   */
  beta?: boolean;
  /**
   * Plan-gated feature this item's destination requires (see
   * lib/billing-platform/features.ts) — the sidebar renders a lock
   * icon next to the label when the account's plan doesn't include
   * it. The link still navigates; the destination page itself
   * enforces the gate via <PlanGate>, this is just a visual signal.
   */
  feature?: GatedFeature;
  /** See `NavGroup` — omitted for the pinned items (Panel, Zen). */
  group?: NavGroup;
  /**
   * Marks a destination that isn't built yet — the sidebar/mobile "Más"
   * sheet always renders a lock icon (regardless of plan) and the link
   * still navigates, but to a page that just says "Próximamente".
   * Deliberately separate from `feature`: there's no real destination
   * to upsell into with <PlanGate>, unlike a plan-gated feature.
   */
  comingSoon?: boolean;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutGrid },
  // Zen se pinnea junto a Panel (no vive dentro de un grupo) y el sidebar
  // lo renderiza aparte, como tarjeta elevada — es el diferenciador de IA
  // del producto, no "una entrada más del menú".
  { href: "/copilot", labelKey: "copilot", icon: Sparkles, beta: true, feature: "ai_copilot" },

  // ATENCIÓN — lo que se usa entre pacientes, todos los días.
  // "Notificaciones" ya no vive aquí — la campana del header (visible
  // en cualquier pantalla) la reemplaza; tenerla dos veces era
  // redundante.
  { href: "/contacts", labelKey: "contacts", icon: Users, group: "atencion" },
  { href: "/agenda", labelKey: "agenda", icon: Calendar, group: "atencion" },
  { href: "/inbox", labelKey: "inbox", icon: MessageCircle, feature: "whatsapp_inbox", group: "atencion" },
  { href: "/pipelines", labelKey: "pipelines", icon: Share2, group: "atencion" },

  // OPERACIÓN — administración del negocio, no del sillón.
  { href: "/billing", labelKey: "billing", icon: CreditCard, group: "operacion" },
  { href: "/broadcasts", labelKey: "broadcasts", icon: Radio, feature: "broadcasts", group: "operacion" },
  { href: "/automations", labelKey: "automations", icon: Zap, feature: "automations", group: "operacion" },
  { href: "/flows", labelKey: "flows", icon: Workflow, beta: true, feature: "automations", group: "operacion" },
  { href: "/agents", labelKey: "aiAgents", icon: Bot, feature: "ai_autoreply", group: "operacion" },

  // MARKETING — anunciada en el mockup como "PRONTO": los 5 destinos
  // navegan a una página real de "Próximamente" (ver
  // src/components/marketing/coming-soon-state.tsx), no a nada
  // funcional todavía. `comingSoon` fuerza el candado en el nav sin
  // depender de un plan/feature que no existe.
  { href: "/marketing/summary", labelKey: "marketingSummary", icon: BarChart3, comingSoon: true, group: "marketing" },
  { href: "/marketing/campaigns", labelKey: "marketingCampaigns", icon: Megaphone, comingSoon: true, group: "marketing" },
  { href: "/marketing/social", labelKey: "marketingSocial", icon: AtSign, comingSoon: true, group: "marketing" },
  { href: "/marketing/content", labelKey: "marketingContent", icon: Newspaper, comingSoon: true, group: "marketing" },
  { href: "/marketing/requests", labelKey: "marketingRequests", icon: Inbox, comingSoon: true, group: "marketing" },

  // CONFIGURACIÓN — se configura una vez, no se visita a diario.
  // Sin `feature` propio: la activación/slug (PublicBookingSettings) es
  // gratis en todo plan, solo la personalización y el anticipo (dentro de
  // /booking-page) están gateadas — bloquear el ítem entero ocultaría lo
  // gratuito. Reemplaza al antiguo ítem "Sitio web" (/landing).
  { href: "/booking-page", labelKey: "bookingPage", icon: Link2, group: "configuracion" },
];

/**
 * Applies a user's saved nav order (a flat array of hrefs) on top of the
 * default list, WITHOUT letting an item cross its group boundary — an
 * item with no `group` (Panel, Zen) always keeps its default pinned
 * position; everything else can only be reordered against its own
 * group's siblings. `order` is still stored/read as one flat array
 * (see `profiles.nav_order`); this just re-buckets it by group before
 * applying the existing "matched-first, then default-order leftovers"
 * algorithm within each bucket.
 */
export function applyNavOrder(items: NavItem[], order: string[] | null | undefined): NavItem[] {
  if (!order || order.length === 0) return items;

  function reorderBucket(bucket: NavItem[]): NavItem[] {
    const remaining = new Map(bucket.map((item) => [item.href, item]));
    const ordered: NavItem[] = [];
    for (const href of order!) {
      const item = remaining.get(href);
      if (item) {
        ordered.push(item);
        remaining.delete(href);
      }
    }
    ordered.push(...remaining.values());
    return ordered;
  }

  const pinned = items.filter((item) => !item.group);
  const groups = NAV_GROUP_ORDER.map((group) => reorderBucket(items.filter((item) => item.group === group)));
  return [...pinned, ...groups.flat()];
}
