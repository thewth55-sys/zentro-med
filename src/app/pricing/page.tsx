import { redirect } from "next/navigation";

// This page used to describe the old bundled CRM+Marketing tiers
// (Zentro Salud Starter/Pro). The redesigned root landing (see
// src/app/landing-content.ts) now covers CRM pricing directly in its
// own #planes section, with managed marketing unbundled into a
// separate "Zentro Med Marketing" cross-sell — a standalone /pricing
// page describing the old bundle would just contradict it. Redirect
// to the landing's pricing section instead of maintaining two
// disagreeing sources of truth for plan prices.
export default function PricingPage() {
  redirect("/#planes");
}
