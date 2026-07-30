"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase/client";
import { saveNativeSession, clearNativeSession } from "@/lib/native-session";

/**
 * Backs up the Supabase session into native storage whenever it
 * changes — see native-session.ts for why this exists (WebView
 * cookie persistence isn't reliable across every Android OEM). Mount
 * once per authenticated session, same pattern as PushRegistration /
 * BiometricLock. The actual restore-on-launch happens on the login
 * page (the only page reachable without a session), not here.
 */
export function NativeSessionSync() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        void saveNativeSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      } else if (event === "SIGNED_OUT") {
        void clearNativeSession();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
