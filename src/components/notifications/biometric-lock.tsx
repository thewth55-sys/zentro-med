"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { Fingerprint, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type LockStatus = "checking" | "unlocked" | "locked";

// A background→foreground cycle shorter than this is almost certainly
// our own biometric prompt's transient Activity opening and closing
// (see the loop this caused — plugin-level resume events fire for
// that too), or a system dialog like the notification-permission
// prompt closing — not the user actually switching away and back.
// Only a gap at least this long re-triggers the lock.
const MIN_BACKGROUND_MS = 3000;

/**
 * App-lock gate for the Android app — wraps the entire authenticated
 * shell (dashboard-shell.tsx) so patient records stay hidden behind
 * a biometric prompt every time the app opens or is genuinely
 * backgrounded and resumed, independent of whether the underlying
 * Supabase session cookie is still valid.
 *
 * Uses @capacitor/app's appStateChange (real OS-level foreground/
 * background transitions) instead of the biometric plugin's own
 * addResumeListener — that one turned out to fire for ANY Activity
 * resume within this app's own process, including the biometric
 * prompt's own transient Activity closing and the notification
 * permission dialog closing, which caused an infinite re-lock loop.
 * Gating on elapsed background time (not just "did isActive flip")
 * filters those out.
 *
 * No-ops entirely on the regular web app and on devices with no
 * biometry enrolled (checkBiometry().isAvailable === false).
 */
export function BiometricLock({ children }: { children: React.ReactNode }) {
  const t = useTranslations("BiometricLock");
  const [status, setStatus] = useState<LockStatus>("checking");
  const backgroundedAtRef = useRef<number | null>(null);
  const biometryAvailableRef = useRef(false);

  const tryUnlock = useCallback(async () => {
    setStatus("checking");
    try {
      await BiometricAuth.authenticate({
        reason: t("reason"),
        cancelTitle: t("cancel"),
        androidTitle: t("androidTitle"),
      });
      setStatus("unlocked");
    } catch (err) {
      console.error("Biometric auth failed:", err);
      setStatus("locked");
    }
  }, [t]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setStatus("unlocked");
      return;
    }

    let appStateHandle: { remove: () => void } | undefined;

    (async () => {
      try {
        const result = await BiometricAuth.checkBiometry();
        if (!result.isAvailable) {
          setStatus("unlocked");
          return;
        }
        biometryAvailableRef.current = true;
        await tryUnlock();

        appStateHandle = await App.addListener("appStateChange", ({ isActive }) => {
          if (!biometryAvailableRef.current) return;

          if (!isActive) {
            backgroundedAtRef.current = Date.now();
            return;
          }

          const backgroundedAt = backgroundedAtRef.current;
          backgroundedAtRef.current = null;
          if (backgroundedAt && Date.now() - backgroundedAt >= MIN_BACKGROUND_MS) {
            setStatus("locked");
          }
        });
      } catch (err) {
        console.error("[BiometricLock] checkBiometry threw:", err);
        setStatus("unlocked");
      }
    })();

    return () => appStateHandle?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "checking") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Fingerprint className="size-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">{t("lockedMessage")}</p>
        <Button onClick={tryUnlock}>{t("unlockButton")}</Button>
      </div>
    );
  }

  return <>{children}</>;
}
