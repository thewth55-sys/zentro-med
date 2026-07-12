import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/google-calendar/client";
import { getBaseUrl } from "@/lib/site-url";

/**
 * GET /api/google-calendar/connect — starts the OAuth consent flow.
 * Only a doctor connects THEIR OWN calendar (no admin-on-behalf-of
 * flow — Google's consent screen has to be completed by the actual
 * account owner), so this resolves the doctor row from the caller's
 * own session rather than taking a doctorId param.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${getBaseUrl(request)}/login`);
  }

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!doctor) {
    return NextResponse.json(
      { error: "No hay un perfil de doctor vinculado a tu cuenta" },
      { status: 403 },
    );
  }

  return NextResponse.redirect(buildAuthUrl(doctor.id));
}
