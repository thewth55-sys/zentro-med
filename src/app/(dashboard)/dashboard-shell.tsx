"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { PresenceHeartbeat } from "@/components/presence/presence-heartbeat";
import { NotificationAlerts } from "@/components/notifications/notification-alerts";
import { PushRegistration } from "@/components/notifications/push-registration";
import { BiometricLock } from "@/components/notifications/biometric-lock";
import { NativeSessionSync } from "@/components/notifications/native-session-sync";
import { AccessBanner } from "@/components/billing-platform/access-banner";
import { AccessLockOverlay } from "@/components/billing-platform/access-lock-overlay";
import { StartCheckoutRedirect } from "@/components/billing-platform/start-checkout-redirect";
import { PurchaseConversionTracker } from "@/components/billing-platform/purchase-conversion-tracker";
import { ZenBubble } from "@/components/copilot/zen-bubble";

// Auth-gated dashboard shell. Extracted from the layout so the layout
// itself can stay a server component and export metadata (noindex) —
// client components can't export Next's metadata object.

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Sidebar drawer state — only used on mobile. On lg+ the sidebar is
  // always visible and this stays at `false` (ignored by the component).
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Hoisted here (not inside Sidebar/MobileTabBar) because both mount
  // simultaneously — one hidden by CSS depending on viewport, not
  // unmounted — so two independent hook instances would each open a
  // realtime channel under the SAME name and the second `.on()` call
  // would throw ("cannot add postgres_changes callbacks... after
  // subscribe()"). One subscription, passed down as props, fixes it.
  const totalUnread = useTotalUnread();
  const unreadNotifications = useUnreadNotifications();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <BiometricLock>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Reports this tab's online/away presence once we know a user is
            signed in. Headless — renders nothing. */}
        <PresenceHeartbeat />
        {/* Plays a chime / fires a native popup on new messages or
            assignments while this tab is open. Headless — renders nothing. */}
        <NotificationAlerts />
        {/* Registers this device's FCM token when running inside the
            Capacitor Android app — no-op in a regular browser tab. */}
        <PushRegistration />
        {/* Backs up the session to native storage on change — see
            native-session.ts for why WebView cookies alone aren't
            reliable enough on some Android OEMs. */}
        <NativeSessionSync />
        <StartCheckoutRedirect />
        <PurchaseConversionTracker />
        <AccessLockOverlay />
        <Sidebar
          open={sidebarOpen}
          onClose={closeSidebar}
          totalUnread={totalUnread}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onOpenSidebar={() => setSidebarOpen(true)} unreadNotifications={unreadNotifications} />
          <AccessBanner />
          {/* Thinner horizontal padding on mobile so cards have room to
              breathe; extra bottom padding on mobile so content doesn't
              end up hidden behind the fixed MobileTabBar. */}
          <main className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 lg:pb-6 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            {children}
          </main>
        </div>
        <ZenBubble />
        <MobileTabBar totalUnread={totalUnread} />
      </div>
    </BiometricLock>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </AuthProvider>
  );
}
