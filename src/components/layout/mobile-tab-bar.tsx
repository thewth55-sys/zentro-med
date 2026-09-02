"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, MoreHorizontal, Settings, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { useNavFeatureAccess } from "@/hooks/use-nav-feature-access";
import { navItems, NAV_GROUP_ORDER } from "@/lib/nav-items";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/** El móvil no es el escritorio comprimido: 5 destinos de uso diario en
 *  la barra inferior (de pie, con una mano), el resto en una hoja
 *  "Más" con el mismo agrupamiento que ya usa el sidebar de escritorio
 *  — nada se esconde, solo se prioriza. */
const PINNED_HREFS = ["/dashboard", "/agenda", "/contacts", "/inbox", "/copilot"];

interface MobileTabBarProps {
  /** Lifted to DashboardShell — see the comment there for why this
   *  can't be a local `useTotalUnread()`/`useUnreadNotifications()`
   *  call (Sidebar and MobileTabBar mount at the same time). */
  totalUnread: number;
  unreadNotifications: number;
}

export function MobileTabBar({ totalUnread, unreadNotifications }: MobileTabBarProps) {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const { isPlatformAdmin } = usePlatformAdmin();
  const featureAccess = useNavFeatureAccess();
  const [moreOpen, setMoreOpen] = useState(false);

  const pinnedItems = PINNED_HREFS.map((href) => navItems.find((item) => item.href === href)).filter(
    (item): item is NonNullable<typeof item> => !!item,
  );
  const moreGroups = NAV_GROUP_ORDER.map((group) => ({
    group,
    items: navItems.filter((item) => item.group === group && !PINNED_HREFS.includes(item.href)),
  }));

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navegación principal"
      >
        <ul className="grid grid-cols-6">
          {pinnedItems.map((item) => {
            const active = isActive(item.href);
            const isLocked = item.feature ? !featureAccess[item.feature] : false;
            const showUnreadDot = item.href === "/inbox" && totalUnread > 0 && !active;
            const showNotificationBadge = item.href === "/notifications" && unreadNotifications > 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-5" />
                  {t(item.labelKey)}
                  {isLocked && <Lock className="absolute top-1 right-[22%] size-2.5 text-muted-foreground/60" />}
                  {showUnreadDot && (
                    <span className="absolute top-1 right-[26%] size-1.5 rounded-full bg-primary" />
                  )}
                  {showNotificationBadge && (
                    <span className="absolute top-0.5 right-[22%] flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-semibold text-primary-foreground">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex w-full flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
            >
              <MoreHorizontal className="size-5" />
              {t("more")}
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("more")}</SheetTitle>
            <SheetDescription>{t("moreDesc")}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-6">
            {moreGroups.map(({ group, items }) =>
              items.length === 0 ? null : (
                <div key={group}>
                  <p className="mb-1.5 px-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    {t(`group_${group}`)}
                  </p>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const isLocked = item.feature ? !featureAccess[item.feature] : false;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                            isActive(item.href)
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          <item.icon className="size-4" />
                          <span className="flex-1">{t(item.labelKey)}</span>
                          {isLocked && <Lock className="size-3.5 shrink-0 text-muted-foreground/60" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ),
            )}

            <div>
              <div className="space-y-1 border-t border-border pt-3">
                <Link
                  href="/settings"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActive("/settings") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
                  )}
                >
                  <Settings className="size-4" />
                  {t("settings")}
                </Link>
                {isPlatformAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <ShieldCheck className="size-4" />
                    Admin
                  </Link>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
