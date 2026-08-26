"use client";

import { PlanGate } from "@/components/billing-platform/plan-gate";
import { CopilotChat } from "@/components/copilot/copilot-chat";

export default function CopilotPage() {
  return (
    <PlanGate feature="ai_copilot" featureLabel="Copiloto de IA">
      <CopilotChat />
    </PlanGate>
  );
}
