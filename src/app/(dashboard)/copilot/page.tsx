"use client";

import { PlanGate } from "@/components/billing-platform/plan-gate";
import { CopilotChat } from "@/components/copilot/copilot-chat";
import { CopilotInsightsPanel } from "@/components/copilot/copilot-insights-panel";
import { CopilotAgentsPanel } from "@/components/copilot/copilot-agents-panel";

export default function CopilotPage() {
  return (
    <PlanGate feature="ai_copilot" featureLabel="Copiloto de IA">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-8">
        <CopilotChat />
        <CopilotInsightsPanel />
        <CopilotAgentsPanel />
      </div>
    </PlanGate>
  );
}
