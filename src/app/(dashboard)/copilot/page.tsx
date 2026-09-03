"use client";

import { PlanGate } from "@/components/billing-platform/plan-gate";
import { CopilotChat } from "@/components/copilot/copilot-chat";
import { CopilotInsightsPanel } from "@/components/copilot/copilot-insights-panel";
import { CopilotAgentsPanel } from "@/components/copilot/copilot-agents-panel";

export default function CopilotPage() {
  return (
    <PlanGate feature="ai_copilot" featureLabel="Copiloto de IA">
      {/* 2 columnas como el mockup: chat a la izquierda (más ancho),
          insights + agentes activos apilados a la derecha — mismo
          patrón lg:grid-cols-3 (2/1) que ya usa el dashboard. */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 pb-8 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <CopilotChat />
        </div>
        <div className="space-y-4 lg:col-span-1">
          <CopilotInsightsPanel />
          <CopilotAgentsPanel />
        </div>
      </div>
    </PlanGate>
  );
}
