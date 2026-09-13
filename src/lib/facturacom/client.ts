// ============================================================
// factura.com SANDBOX-only client — CFDI (Mexican e-invoicing) PAC.
//
// This ONLY ever talks to sandbox.factura.com. There is no
// FACTURACOM_ENV toggle and no production host anywhere in this file
// on purpose — a config mistake (wrong env var, copy-pasted
// production keys) can never accidentally stamp a real CFDI while
// this integration is still a connectivity smoke test.
//
// Lazy config getter, same posture as getStripeClient() in
// billing-platform/stripe.ts: a missing key only breaks the one route
// that actually calls this, build/typecheck stay green without real
// credentials configured.
// ============================================================

const SANDBOX_HOST = "https://sandbox.factura.com/api";
// Static plugin identifier factura.com's docs specify for every request
// (not a secret — same value for every integrator).
const F_PLUGIN = "9d4095c8f7ed5785cb14c0e3b033eeb8252416ed";

interface FacturaComConfig {
  apiKey: string;
  secretKey: string;
}

let cachedConfig: FacturaComConfig | null = null;

function getFacturaComConfig(): FacturaComConfig {
  if (cachedConfig) return cachedConfig;
  const apiKey = process.env.FACTURACOM_SANDBOX_API_KEY;
  const secretKey = process.env.FACTURACOM_SANDBOX_SECRET_KEY;
  if (!apiKey || !secretKey) {
    throw new Error("FACTURACOM_SANDBOX_API_KEY / FACTURACOM_SANDBOX_SECRET_KEY is not configured");
  }
  cachedConfig = { apiKey, secretKey };
  return cachedConfig;
}

export async function createSandboxCfdi(payload: unknown): Promise<{ status: number; body: unknown }> {
  const { apiKey, secretKey } = getFacturaComConfig();
  const res = await fetch(`${SANDBOX_HOST}/v4/cfdi40/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "F-PLUGIN": F_PLUGIN,
      "F-Api-Key": apiKey,
      "F-Secret-Key": secretKey,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}
