// ============================================================
// POST /api/platform-admin/facturacom/test-cfdi
//
// Fires one hardcoded CFDI 4.0 at factura.com's SANDBOX API (no
// fiscal validity) and returns its raw response. Platform-admin only.
// Doesn't touch any application table — no accountId, no contact, no
// invoice — this is a pure passthrough smoke test for validating
// factura.com credentials/connectivity/field mapping before any real
// integration is designed.
// ============================================================

import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { toErrorResponse } from "@/lib/auth/account";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { createSandboxCfdi } from "@/lib/facturacom/client";
import { buildTestCfdiPayload } from "@/lib/facturacom/build-test-cfdi";

export async function POST(request: Request) {
  try {
    const adminCtx = await requirePlatformAdmin();

    const limit = checkRateLimit(`platformAdmin:facturacomTest:${adminCtx.userId}`, RATE_LIMITS.adminAction);
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as
      | { descripcion?: unknown; cantidad?: unknown; valorUnitario?: unknown }
      | null;

    const descripcion = typeof body?.descripcion === "string" && body.descripcion.trim() ? body.descripcion.trim() : undefined;
    const cantidad = typeof body?.cantidad === "number" && body.cantidad > 0 ? body.cantidad : undefined;
    const valorUnitario = typeof body?.valorUnitario === "number" && body.valorUnitario > 0 ? body.valorUnitario : undefined;

    const payload = buildTestCfdiPayload({ descripcion, cantidad, valorUnitario });
    const { status, body: facturaResponse } = await createSandboxCfdi(payload);

    return NextResponse.json({ ok: status >= 200 && status < 300, status, facturaResponse });
  } catch (err) {
    return toErrorResponse(err);
  }
}
