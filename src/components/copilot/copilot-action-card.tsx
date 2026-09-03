import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ActionLike {
  id: string;
  summary: string;
  status: "pending" | "running" | "done" | "cancelled";
}

interface Props {
  action: ActionLike;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Tarjeta de "acción propuesta" — requiere un tap humano deliberado
 *  para ejecutarse (nunca una confirmación hablada: la ejecución de
 *  escrituras está deliberadamente aislada del modelo, ver
 *  execute/route.ts). Compartida entre el hilo de Chat y la pantalla
 *  de Voz para que una acción pendiente sea visible y confirmable sin
 *  tener que cambiar de tab. */
export function CopilotActionCard({ action, onConfirm, onCancel }: Props) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-primary">Acción propuesta</p>
          <p className="mt-0.5 text-foreground">{action.summary}</p>
        </div>
        {action.status === "done" ? (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="size-4" /> Hecho
          </span>
        ) : null}
      </div>
      {action.status !== "done" ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onConfirm} disabled={action.status === "running"}>
            {action.status === "running" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Confirmar
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={action.status === "running"}>
            <X className="size-4" /> Cancelar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
