import { Loader2, Square } from "lucide-react";

interface Props {
  recording: boolean;
  transcribing: boolean;
  onStopRecording: () => void;
}

/** Versión visualmente más rica del banner de grabación — reusa los
 *  mismos 2 estados (`recording`/`transcribing`) que ya existían en
 *  copilot-chat.tsx, sin estado nuevo. No es un "modo voz" separado:
 *  solo aparece mientras se está grabando/transcribiendo una nota de
 *  voz, en el mismo lugar donde antes vivía el banner chico. */
export function CopilotVoiceBand({ recording, transcribing, onStopRecording }: Props) {
  if (!recording && !transcribing) return null;

  return (
    <div className="mb-2 flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-5 text-center">
      <div className="relative flex size-16 items-center justify-center">
        {recording && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/30" />
        )}
        <span className="relative flex size-16 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
          {transcribing ? <Loader2 className="size-6 animate-spin" /> : <MicWaveform />}
        </span>
      </div>

      <p className="text-xs font-semibold tracking-wider text-primary uppercase">
        {transcribing ? "Transcribiendo" : "Escuchando"}
      </p>
      <p className="max-w-xs text-sm text-muted-foreground">
        {transcribing
          ? "Un momento, estoy pasando tu nota de voz a texto…"
          : "Habla con naturalidad. Suelta el micrófono cuando termines."}
      </p>

      {recording && (
        <button
          type="button"
          onClick={onStopRecording}
          className="inline-flex items-center gap-2 rounded-full bg-foreground/90 px-4 py-2 text-xs font-semibold text-background hover:bg-foreground"
        >
          <Square className="size-3.5" /> Detener y enviar
        </button>
      )}
    </div>
  );
}

/** Barritas con retraso escalonado — mismo truco de "puntos
 *  cargando" que ya usa copilot-chat.tsx (animate-bounce con
 *  animation-delay), aquí como forma de onda decorativa. */
function MicWaveform() {
  return (
    <span className="flex items-end gap-0.5" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-0.5 animate-pulse rounded-full bg-primary-foreground"
          style={{
            height: [8, 14, 10, 16][i],
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </span>
  );
}
