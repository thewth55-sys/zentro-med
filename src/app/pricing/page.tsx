import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLAN_CONFIG } from "@/lib/billing-platform/plans";

export const metadata: Metadata = {
  title: "Precios — Zentro Med",
  description: "Planes de Zentro Med: prueba gratis 30 días, CRM independiente por asiento, o el bundle Zentro Salud con marketing incluido.",
};

const FEATURES_ALL = [
  "Bandeja de WhatsApp compartida",
  "Pipeline de pacientes",
  "Agenda de doctores y consultorios",
  "Expediente clínico",
  "Cotizaciones, facturas y pagos",
  "Automatizaciones y flows",
];

const FEATURES_BUNDLE_STARTER = ["Contenido y Meta Ads gestionados", "Landing de especialidad"];
const FEATURES_BUNDLE_PRO = ["Google Ads y SEO local", "Dashboard de retención vs. captación"];

export default function PricingPage() {
  const standalone = PLAN_CONFIG.standalone;
  const starter = PLAN_CONFIG.zentro_salud_starter;
  const pro = PLAN_CONFIG.zentro_salud_pro;

  return (
    <div className="min-h-screen bg-background px-4 py-16 text-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          {/* The wordmark PNG bakes in black text, which disappears against
              the app's dark-mode default — an isotipo (color, mode-agnostic)
              plus real text (follows --foreground) works in both modes. */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
            <img src="/zentro-isotipo.png" alt="" className="h-7 w-7" />
            <span className="text-lg font-semibold text-foreground">Zentro</span>
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Un CRM médico. Un solo proveedor.</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            30 días de prueba sin tarjeta. Después, elige el CRM solo o el bundle
            Zentro Salud con marketing gestionado incluido.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <PlanCard
            title="Prueba gratuita"
            price="Gratis por 30 días"
            description="Todo Zentro Med, sin tarjeta de crédito."
            features={FEATURES_ALL}
            cta={{ label: "Empezar gratis", href: "/signup" }}
          />

          <PlanCard
            title="Zentro Med independiente"
            price={`$${standalone.seatPriceUsd} USD/usuario/mes`}
            description="Solo el CRM, sin servicio de marketing. Pensado como salida, no como punto de entrada."
            features={FEATURES_ALL}
            cta={{ label: "Suscribirme", href: "/signup?plan=standalone" }}
          />

          <PlanCard
            title="Zentro Salud Starter"
            price={`$${starter.basePriceUsd} USD/mes`}
            description={`Incluye ${starter.includedSeats} usuarios · $${starter.seatPriceUsd} USD/usuario extra`}
            features={[...FEATURES_ALL, ...FEATURES_BUNDLE_STARTER]}
            cta={{ label: "Suscribirme", href: "/signup?plan=zentro_salud_starter" }}
            highlight
          />
        </div>

        <div className="mx-auto mt-6 max-w-md">
          <PlanCard
            title="Zentro Salud Pro"
            price={`$${pro.basePriceUsd} USD/mes`}
            description={`Incluye ${pro.includedSeats} usuarios · $${pro.seatPriceUsd} USD/usuario extra`}
            features={[...FEATURES_ALL, ...FEATURES_BUNDLE_STARTER, ...FEATURES_BUNDLE_PRO]}
            cta={{ label: "Suscribirme", href: "/signup?plan=zentro_salud_pro" }}
          />
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>{" "}
          y activa tu plan desde Ajustes → Suscripción.
        </p>
      </div>
    </div>
  );
}

function PlanCard({
  title,
  price,
  description,
  features,
  cta,
  highlight,
}: {
  title: string;
  price: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-6 ${
        highlight ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border bg-card"
      }`}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-2xl font-bold text-foreground">{price}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <ul className="mt-4 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            {f}
          </li>
        ))}
      </ul>
      <Button render={<Link href={cta.href} />} className="mt-6 w-full">
        {cta.label}
      </Button>
    </div>
  );
}
