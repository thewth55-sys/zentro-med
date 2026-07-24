import { describe, it, expect } from "vitest";
import { resolveFeatureAccess } from "./features";

describe("resolveFeatureAccess", () => {
  it("falls back to the plan default when there's no override", () => {
    expect(resolveFeatureAccess("trial", "automations", null)).toBe(false);
    expect(resolveFeatureAccess("esencial", "automations", null)).toBe(false);
    expect(resolveFeatureAccess("profesional", "automations", null)).toBe(true);
  });

  it("falls back to the plan default when the feature key is absent", () => {
    expect(resolveFeatureAccess("profesional", "broadcasts", { automations: false })).toBe(true);
  });

  it("Esencial gets the WhatsApp inbox but not automations/broadcasts", () => {
    expect(resolveFeatureAccess("esencial", "whatsapp_inbox", null)).toBe(true);
    expect(resolveFeatureAccess("esencial", "broadcasts", null)).toBe(false);
  });

  it("an override forces the feature on even on a plan that wouldn't include it", () => {
    expect(resolveFeatureAccess("trial", "automations", { automations: true })).toBe(true);
  });

  it("an override forces the feature off even on a plan that would include it", () => {
    expect(resolveFeatureAccess("clinica", "broadcasts", { broadcasts: false })).toBe(false);
  });
});
