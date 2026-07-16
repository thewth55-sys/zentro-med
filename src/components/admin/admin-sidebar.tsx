"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, ShieldCheck, Users, UserCog } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/accounts", label: "Cuentas", icon: Users, exact: false },
  { href: "/admin/audit-log", label: "Log de auditoría", icon: History, exact: true },
  { href: "/admin/team", label: "Equipo interno", icon: UserCog, exact: true },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-card">
      <Link href="/admin" className="flex items-center gap-2 border-b border-border px-4 py-4">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">Zentro Med — Admin</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-2 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          ← Volver a la app
        </Link>
      </div>
    </aside>
  );
}
