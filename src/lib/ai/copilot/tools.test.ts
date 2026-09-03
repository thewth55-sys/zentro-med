import { describe, expect, it } from "vitest";
import { formatWhen } from "./tools";

describe("formatWhen", () => {
  it("shows noon Mexico City as 12:00 p.m., not shifted 6h to 06:00 p.m. (regression: bug reported by user)", () => {
    // 12:00 mediodía en America/Mexico_City (UTC-6) es 18:00 UTC. Antes del
    // fix, formatWhen no fijaba timeZone y el proceso Node (UTC en
    // hosting serverless) mostraba "06:00 p.m." aunque el dato guardado
    // fuera correcto — esta es exactamente la discrepancia reportada.
    const noonMexico = "2026-09-04T12:00:00-06:00";
    const formatted = formatWhen(noonMexico, "America/Mexico_City");
    expect(formatted).toContain("12:00");
    expect(formatted).not.toContain("06:00 p.m.");
    expect(formatted).not.toContain("18:00");
  });

  it("respects a different account timezone", () => {
    const iso = "2026-09-04T12:00:00-06:00"; // 13:00 (1pm) en Bogotá (UTC-5)
    const formatted = formatWhen(iso, "America/Bogota");
    expect(formatted).toContain("01:00 p.m.");
  });

  it("returns the raw string for an invalid ISO date instead of throwing", () => {
    expect(formatWhen("no-es-una-fecha", "America/Mexico_City")).toBe("no-es-una-fecha");
  });
});
