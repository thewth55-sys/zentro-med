"use client";

import { useHasFeature } from "@/hooks/use-has-feature";
import type { GatedFeature } from "@/lib/billing-platform/features";

/**
 * Exhaustive `{feature: hasAccess}` map for every `GatedFeature` — the
 * lock-icon source for both the desktop sidebar (`sidebar.tsx`) and the
 * mobile tab bar's "Más" sheet (`mobile-tab-bar.tsx`), extracted here so
 * the two surfaces can't drift apart. One `useHasFeature` call per
 * feature, at the top level — hooks can't be called conditionally/in a
 * loop, so this can't be built from `GATED_FEATURES.map(...)`.
 */
export function useNavFeatureAccess(): Record<GatedFeature, boolean> {
  return {
    automations: useHasFeature("automations"),
    ai_autoreply: useHasFeature("ai_autoreply"),
    whatsapp_inbox: useHasFeature("whatsapp_inbox"),
    broadcasts: useHasFeature("broadcasts"),
    // Sin ítem de nav propio desde que /landing dejó de tener entrada en
    // el sidebar (reemplazada por /booking-page) — el Record debe seguir
    // siendo exhaustivo sobre GatedFeature.
    landing_builder: useHasFeature("landing_builder"),
    // Sin ítem de nav propio (es un gate de fondo del cron), pero el Record
    // debe ser exhaustivo sobre GatedFeature.
    conversation_reminders: useHasFeature("conversation_reminders"),
    clinic_hours: useHasFeature("clinic_hours"),
    // El ítem de nav /booking-page en sí no está gateado (ver nav-items.ts) —
    // esta entrada sigue existiendo para que las PlanGate DENTRO de esa
    // página (personalización, anticipo) puedan resolver el acceso.
    booking_page: useHasFeature("booking_page"),
    ai_copilot: useHasFeature("ai_copilot"),
    // Sin ítem de nav propio (vive dentro de Ajustes → Agenda), mismo
    // motivo que conversation_reminders arriba.
    payment_gateway: useHasFeature("payment_gateway"),
    // Sin ítem de nav propio (vive dentro de la ficha de cada médico en
    // Ajustes → Agenda), mismo motivo que payment_gateway arriba.
    intake_forms: useHasFeature("intake_forms"),
  };
}
