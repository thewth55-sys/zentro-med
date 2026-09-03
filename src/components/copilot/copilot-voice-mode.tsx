import { Loader2, Mic, Square, Volume2, X } from "lucide-react";

interface Props {
  recording: boolean;
  transcribing: boolean;
  /** Esperando la respuesta de texto del copiloto (entre transcribir y
   *  que llegue la reply) — mapea al `loading` de copilot-chat.tsx. */
  thinking: boolean;
  /** Reproduciendo (o generando) el audio de la última respuesta de
   *  Zen — `ttsBusyId !== null || playingId !== null` en el padre. */
  speaking: boolean;
  /** Texto de la última respuesta, mostrado como leyenda mientras se
   *  reproduce — igual se guarda completo en `turns`/Chat, esto es
   *  solo la vista de esta pantalla. */
  replyText: string | null;
  elapsedSec: number;
  onToggleRecording: () => void;
  onStopSpeaking: () => void;
  onClose: () => void;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Pantalla dedicada del tab "Voz" — orbe animado con 5 estados
 * (lista/escuchando/transcribiendo/pensando/respondiendo), leyenda de
 * la respuesta mientras se reproduce en voz, forma de onda decorativa
 * y los controles del mockup: micrófono, timer "Conversación activa"
 * (solo mientras graba) y cerrar. No se muestra una transcripción en
 * vivo con un ejemplo de frase mientras "escucha" — nuestra
 * transcripción es posterior a grabar (Whisper por lote), no en
 * tiempo real, así que inventar un texto "escuchado" ahí sería
 * fabricar algo que el sistema no hace.
 */
export function CopilotVoiceMode({
  recording,
  transcribing,
  thinking,
  speaking,
  replyText,
  elapsedSec,
  onToggleRecording,
  onStopSpeaking,
  onClose,
}: Props) {
  const stateLabel = transcribing
    ? "Transcribiendo"
    : thinking
      ? "Pensando"
      : speaking
        ? "Respondiendo"
        : recording
          ? "Escuchando"
          : "Lista para escuchar";

  const busy = recording || transcribing || thinking || speaking;

  function handleOrbClick() {
    if (speaking) {
      onStopSpeaking();
      return;
    }
    onToggleRecording();
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-4 py-8">
      <div className="relative flex size-28 items-center justify-center">
        {(recording || speaking) && (
          <>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/25" />
            <span className="absolute inline-flex size-[85%] animate-pulse rounded-full bg-primary/20" />
          </>
        )}
        <button
          type="button"
          onClick={handleOrbClick}
          disabled={transcribing || thinking}
          aria-label={speaking ? "Interrumpir" : recording ? "Detener y enviar" : "Empezar a hablar"}
          className="relative flex size-24 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-transform hover:scale-[1.03] disabled:opacity-70"
          style={{ background: "radial-gradient(circle at 35% 30%, #4ADE5A, #0B2A1E)" }}
        >
          {transcribing || thinking ? (
            <Loader2 className="size-8 animate-spin" />
          ) : speaking ? (
            <Volume2 className="size-8" />
          ) : recording ? (
            <Square className="size-7" />
          ) : (
            <Mic className="size-8" />
          )}
        </button>
      </div>

      <p className="text-xs font-semibold tracking-wider text-primary uppercase">{stateLabel}</p>
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        {transcribing
          ? "Un momento, estoy pasando tu nota de voz a texto…"
          : thinking
            ? "Zen está preparando tu respuesta…"
            : speaking && replyText
              ? replyText
              : recording
                ? "Habla con naturalidad. Toca el círculo cuando termines."
                : "Toca el círculo verde para empezar a hablar con Zen."}
      </p>

      {busy && (recording || speaking) && (
        <span className="flex items-end gap-0.5" aria-hidden="true">
          {[8, 16, 10, 20, 12, 18, 9].map((h, i) => (
            <span
              key={i}
              className="w-0.5 animate-pulse rounded-full bg-primary"
              style={{ height: h, animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </span>
      )}

      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={handleOrbClick}
          disabled={transcribing || thinking}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-muted disabled:opacity-50"
          aria-label={recording ? "Detener" : speaking ? "Interrumpir" : "Micrófono"}
        >
          {speaking ? <Volume2 className="size-4" /> : <Mic className="size-4" />}
        </button>
        {recording && (
          <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Conversación activa · {formatTimer(elapsedSec)}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
          aria-label="Cerrar modo voz"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
