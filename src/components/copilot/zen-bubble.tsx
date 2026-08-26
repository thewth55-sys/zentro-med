"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

import { COPILOT_NAME } from "@/lib/ai/copilot/branding";

/**
 * Burbuja flotante para abrir el chat con Zen (reemplaza el widget de
 * soporte). Se oculta en la propia pantalla de Zen para no duplicar.
 */
export function ZenBubble() {
  const pathname = usePathname();
  if (pathname?.startsWith("/copilot")) return null;

  return (
    <Link
      href="/copilot"
      aria-label={`Abrir chat con ${COPILOT_NAME}`}
      title={`Hablar con ${COPILOT_NAME}`}
      className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <Sparkles className="size-6" />
    </Link>
  );
}
