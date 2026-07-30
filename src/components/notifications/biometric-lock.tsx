"use client";

import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { Fingerprint, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type LockStatus = "checking" | "unlocked" | "locked";

/**
 * App-lock gate for the Android app — wraps the entire authenticated
 * shell (dashboard-shell.tsx) so patient records stay hidden behind
 * a biometric prompt every time the app opens OR resumes from the
 * background, independent of whether the underlying Supabase session
 * cookie is still valid. This is deliberately stricter than "only
 * re-auth when the session expires" — a clinic handling patient data
 * wants the extra layer even if someone picks up an already-unlocked
 * phone.
 *
 * No-ops entirely on the regular web app and on devices with no
 * biometry enrolled (checkBiometry().isAvailable === false) — never
 * lock out a user who has nothing to unlock with.
 */
export function BiometricLock({ children }: { children: React.ReactNode }) {
  const t = useTranslations("BiometricLock");
  const [status, setStatus] = useState<LockStatus>("checking");

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

    let resumeHandle: { remove: () => void } | undefined;

    (async () => {
      try {
        const result = await BiometricAuth.checkBiometry();
        if (!result.isAvailable) {
          setStatus("unlocked");
          return;
        }
        await tryUnlock();
        // IMPORTANT: only update `status` here, never call tryUnlock()
        // (or anything else that invokes authenticate()) from inside
        // this listener. authenticate() shows a native prompt via a
        // transparent Activity (see the plugin's AndroidManifest) —
        // opening/closing THAT activity itself fires a resume event,
        // so auto-re-authenticating here creates an infinite
        // lock → prompt → resume → lock loop. The official plugin
        // README's own example does exactly this (info-only update);
        // requiring one tap on the "unlock" button to re-authenticate
        // is what breaks the cycle.
        resumeHandle = await BiometricAuth.addResumeListener((info) => {
          if (!info.isAvailable) return;
          setStatus("locked");
        });
      } catch (err) {
        console.error("[BiometricLock] checkBiometry threw:", err);
        setStatus("unlocked");
      }
    })();

    return () => resumeHandle?.remove();
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
