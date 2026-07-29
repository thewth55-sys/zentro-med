"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useAuth } from "@/hooks/use-auth";

/**
 * Registers this device for native push notifications — only does
 * anything inside the Capacitor Android app (`isNativePlatform()`);
 * a no-op on the regular web app, where `notification-alerts.tsx`
 * already covers in-tab browser notifications. FCM tokens are what
 * let the SERVER push a notification even with the app fully closed
 * or the phone locked, which the browser Notification API can't do.
 *
 * Gated behind NEXT_PUBLIC_FIREBASE_PUSH_ENABLED: the native
 * @capacitor/push-notifications plugin throws a FATAL (uncatchable
 * from JS — it crashes before the promise can reject) if the
 * Android build has no google-services.json, because
 * PushNotifications.register() calls straight into
 * FirebaseMessaging.getInstance() with no FirebaseApp initialized.
 * Flip this flag on only once google-services.json is in the native
 * build AND FIREBASE_SERVICE_ACCOUNT_JSON is set server-side.
 *
 * Mounted once per signed-in session (dashboard-shell.tsx), same
 * pattern as PresenceHeartbeat / NotificationAlerts.
 */
export function PushRegistration() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const pushEnabled = process.env.NEXT_PUBLIC_FIREBASE_PUSH_ENABLED === "true";
    if (!user || !pushEnabled || !Capacitor.isNativePlatform()) return;

    let registrationHandle: { remove: () => void } | undefined;
    let errorHandle: { remove: () => void } | undefined;
    let tapHandle: { remove: () => void } | undefined;

    (async () => {
      registrationHandle = await PushNotifications.addListener("registration", (token) => {
        void fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.value, platform: "android" }),
        }).catch((err) => console.error("Push token registration failed:", err));
      });

      errorHandle = await PushNotifications.addListener("registrationError", (err) => {
        console.error("Push registration error:", err);
      });

      tapHandle = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const url = action.notification.data?.url;
        if (typeof url === "string" && url.startsWith("/")) {
          router.push(url);
        }
      });

      const permission = await PushNotifications.requestPermissions();
      if (permission.receive === "granted") {
        await PushNotifications.register();
      }
    })();

    return () => {
      registrationHandle?.remove();
      errorHandle?.remove();
      tapHandle?.remove();
    };
  }, [user, router]);

  return null;
}
