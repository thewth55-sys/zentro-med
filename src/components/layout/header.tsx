"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCan } from "@/hooks/use-can";
import { createClient } from "@/lib/supabase/client";
import { Bell, LogOut, Menu, Plus, Settings as SettingsIcon, User } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HelpButton } from "@/components/layout/help-button";
import { GlobalSearch } from "@/components/layout/global-search";
import { AppointmentEditorDialog, type AppointmentDraft } from "@/components/agenda/appointment-editor-dialog";
import { navItems } from "@/lib/nav-items";
import type { Doctor, Room, ServiceType } from "@/types";

interface HeaderProps {
  /** Wired to the shell's drawer state. Used only on mobile — the
   *  hamburger button is hidden on lg+. */
  onOpenSidebar?: () => void;
  /** Lifted to DashboardShell, same reason Sidebar/MobileTabBar take it
   *  as a prop instead of calling useUnreadNotifications() themselves —
   *  see the comment there. */
  unreadNotifications?: number;
}

import { useLocale, useTranslations } from "next-intl";

export function Header({ onOpenSidebar, unreadNotifications = 0 }: HeaderProps) {
  const t = useTranslations("Header");
  const tNav = useTranslations("Sidebar");
  const locale = useLocale();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const canCreateAppointment = useCan("send-messages");

  // Scheduling resources for the "Nueva cita" quick-create — fetched
  // lazily on first click rather than on every page load, since the
  // header mounts on every screen but most visits never open this.
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [draft, setDraft] = useState<AppointmentDraft | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  async function openNewAppointment() {
    if (!resourcesLoaded) {
      const supabase = createClient();
      const [d, r, s] = await Promise.all([
        supabase.from("doctors").select("*").eq("is_active", true).order("name"),
        supabase.from("rooms").select("*").eq("is_active", true).order("name"),
        supabase.from("service_types").select("*").eq("is_active", true).order("name"),
      ]);
      setDoctors((d.data ?? []) as Doctor[]);
      setRooms((r.data ?? []) as Room[]);
      setServiceTypes((s.data ?? []) as ServiceType[]);
      setResourcesLoaded(true);
    }
    const start = new Date();
    start.setMinutes(start.getMinutes() - (start.getMinutes() % 30) + 30, 0, 0);
    const end = new Date(start.getTime() + 30 * 60000);
    setDraft({ mode: "create", startAt: start.toISOString(), endAt: end.toISOString() });
    setEditorOpen(true);
  }

  // Título de la pantalla actual, tomado del nav real (así cada pantalla
  // muestra su propio nombre — incluido Zen — y no cae siempre a "Panel").
  const current = [...navItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((it) => pathname === it.href || pathname.startsWith(`${it.href}/`));
  const title = current
    ? tNav(current.labelKey)
    : pathname.startsWith("/settings")
      ? t("settings")
      : tNav("dashboard");

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  // Fecha larga bajo el título — el mockup la muestra junto al conteo
  // de citas del día, pero ese número ya vive de forma prominente en
  // las stat pills del hero (dashboard-hero.tsx); repetirlo aquí
  // exigiría inyectar datos de página en un header global compartido
  // por todas las rutas, así que solo se agrega la fecha.
  const todayLabel = new Date()
    .toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .replace(/^./, (c) => c.toUpperCase());

  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 py-2 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {/* Hamburger — mobile only. 44×44 hit target per Apple HIG. */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label={t("openMenu")}
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
            {title}
          </h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">{todayLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <GlobalSearch />

        <Link
          href="/notifications"
          aria-label={t("notifications")}
          className="relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 && (
            <span className="absolute right-2 top-2 flex size-2 rounded-full bg-red-500" aria-hidden="true" />
          )}
        </Link>

        {canCreateAppointment && (
          <Button type="button" size="sm" onClick={() => void openNewAppointment()} className="hidden sm:inline-flex">
            <Plus className="size-3.5" />
            {t("newAppointment")}
          </Button>
        )}
        <HelpButton />

        <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none data-popup-open:bg-muted/70 sm:gap-3 sm:pl-1 sm:pr-3"
          aria-label={t("openAccountMenu")}
        >
          <Avatar className="size-8">
            {profile?.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.full_name ?? t("defaultAvatar")}
              />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {profile?.full_name ?? t("defaultUser")}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="min-w-56 bg-popover text-popover-foreground ring-border"
        >
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium text-foreground">
              {profile?.full_name ?? t("defaultUser")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.email ?? ""}
            </p>
          </div>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            render={
              <Link
                href="/settings?tab=profile"
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              />
            }
          >
            <User className="size-4" />
            {t("menuProfile")}
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link
                href="/settings?tab=whatsapp"
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              />
            }
          >
            <SettingsIcon className="size-4" />
            {t("menuSettings")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            onClick={signOut}
            className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <LogOut className="size-4" />
            {t("menuSignOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {canCreateAppointment && (
        <AppointmentEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          draft={draft}
          doctors={doctors}
          rooms={rooms}
          serviceTypes={serviceTypes}
          canEdit={canCreateAppointment}
          onSaved={() => setEditorOpen(false)}
        />
      )}
    </header>
  );
}
