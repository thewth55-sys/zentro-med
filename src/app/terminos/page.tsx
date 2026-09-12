import type { Metadata } from "next";
import Link from "next/link";
import { TerminosContent } from "./terminos-content";

export const metadata: Metadata = {
  title: "Términos y Condiciones de Uso",
  description: "Términos y Condiciones de Uso de la plataforma Zentro Med (v2.0).",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://med.zentrolabs.com/terminos" },
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-bold text-foreground hover:text-primary">
            zentro
          </Link>
          <Link href="/signup" className="text-sm text-muted-foreground hover:text-primary">
            ← Volver al registro
          </Link>
        </div>
      </header>
      <TerminosContent />
    </div>
  );
}
