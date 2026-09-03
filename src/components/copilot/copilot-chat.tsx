"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Mic, Play, Send, Sparkles, Square, Volume2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopilotOnboarding, type CopilotProfileData } from "@/components/copilot/copilot-onboarding";
import { CopilotIntroCard } from "@/components/copilot/copilot-intro-card";
import { CopilotVoiceMode } from "@/components/copilot/copilot-voice-mode";
import { COPILOT_NAME } from "@/lib/ai/copilot/branding";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  /** Nota de voz enviada por el médico (blob URL en sesión; no se persiste). */
  audioUrl?: string;
}

// Render ligero de markdown para las respuestas de Zen: **negritas**,
// viñetas y saltos de línea (sin dependencias externas).
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function renderRich(text: string) {
  return text.split("\n").map((line, i) => {
    const bullet = /^\s*[-•]\s+(.*)$/.exec(line);
    if (bullet) {
      return (
        <div key={i} className="flex gap-2">
          <span className="select-none text-muted-foreground">•</span>
          <span>{renderInline(bullet[1])}</span>
        </div>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" aria-hidden="true" />;
    return <div key={i}>{renderInline(line)}</div>;
  });
}

interface ProposedAction {
  type: string;
  summary: string;
  params: Record<string, unknown>;
}

interface PendingAction extends ProposedAction {
  id: string;
  status: "pending" | "running" | "done" | "cancelled";
}

const SUGGESTIONS = [
  "¿Qué citas hay esta semana?",
  "¿Qué conversaciones llevan tiempo sin responder?",
  "Agenda una cita para un paciente",
];

let actionSeq = 0;

export function CopilotChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  // "Voz" (default, como el mockup) muestra la banda del orbe arriba
  // del composer; "Chat" la colapsa. El historial y el composer de
  // texto quedan visibles en AMBOS modos — el modo solo decide si la
  // banda de voz está expandida o no.
  const [mode, setMode] = useState<"chat" | "voz">("voz");
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
  // Última respuesta de Zen recibida mientras el médico estaba en el
  // tab Voz — se muestra como leyenda en el orbe mientras se reproduce
  // en voz. No es un estado nuevo de verdad: `turns` sigue siendo la
  // única fuente real, esto solo cachea el texto para no tener que
  // buscarlo por índice en cada render del orbe.
  const [lastVoiceReply, setLastVoiceReply] = useState<string | null>(null);
  const [ttsBusyId, setTtsBusyId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState<CopilotProfileData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, actions, loading]);

  // Restaura el historial desde la base (una vez) — así sigue al médico
  // entre dispositivos, no solo en este navegador.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ai/copilot/history", { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (res.ok && Array.isArray(body?.turns) && body.turns.length > 0) {
          setTurns(body.turns as ChatTurn[]);
        }
      } catch {
        /* sin conexión: se sigue en memoria */
      } finally {
        restoredRef.current = true;
      }
    })();
  }, []);

  // Persiste el historial en la base tras cada cambio (una vez restaurado),
  // fire-and-forget para no bloquear la UI.
  useEffect(() => {
    if (!restoredRef.current) return;
    void fetch("/api/ai/copilot/history", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turns: turns.slice(-40) }),
    }).catch(() => {});
  }, [turns]);

  async function loadProfile(): Promise<CopilotProfileData | null> {
    try {
      const res = await fetch("/api/ai/copilot/profile", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setOnboarded(Boolean(body?.onboarded));
        setProfileData(body?.profile ?? null);
        return (body?.profile ?? null) as CopilotProfileData | null;
      }
      // Si no se puede leer (p. ej. permisos), no bloqueamos el chat.
      setOnboarded(true);
      return null;
    } catch {
      setOnboarded(true);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }

  // Saludo de presentación tras el onboarding: dice qué puede hacer y
  // reproduce su voz (el click de "Empezar" habilita el audio del navegador).
  function seedGreeting(profile: CopilotProfileData | null) {
    const saludo = profile?.addressAs ? `Hola, ${profile.addressAs}.` : "¡Hola!";
    const esp = profile?.specialty ? ` Veo que tu área es ${profile.specialty}.` : "";
    const text =
      `${saludo} Soy ${COPILOT_NAME}, tu asistente.${esp}\n\n` +
      "Puedo ayudarte a:\n" +
      "• Consultar tu día: citas, conversaciones sin responder y expedientes.\n" +
      "• Registrar pacientes, agendar/confirmar/cancelar citas, enviar WhatsApp y anotar notas de evolución — siempre con tu confirmación.\n" +
      "• Recordar tus preferencias para las próximas sesiones.\n\n" +
      "Dime qué necesitas, por texto o por voz 🎤. Y puedes escuchar mis respuestas con 🔊.";
    setTurns([{ role: "assistant", content: text }]);
    void speak(text, 0, true);
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function send(text: string, audioUrl?: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userTurn: ChatTurn = { role: "user", content: trimmed, ...(audioUrl ? { audioUrl } : {}) };
    const nextTurns: ChatTurn[] = [...turns, userTurn];
    setTurns(nextTurns);
    setInput("");
    setLoading(true);
    // Capturado al llamar, no al resolver — si el médico mandó esto
    // desde el tab Voz, la respuesta se lee ahí aunque el fetch tarde.
    const wasVoiceMode = mode === "voz";
    const replyIndex = nextTurns.length; // índice donde caerá el turno del asistente
    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextTurns.map((t) => ({ role: t.role, content: t.content })) }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "No se pudo obtener respuesta.");
      }
      const replyText: string = body?.reply ?? "";
      setTurns((prev) => [...prev, { role: "assistant", content: replyText }]);
      if (wasVoiceMode && replyText.trim()) {
        // En el tab Voz la respuesta se lee en voz alta ahí mismo (el
        // orbe cambia a "Respondiendo" con el texto como leyenda) — se
        // sigue guardando en `turns` igual que siempre, así que también
        // queda en el historial de Chat.
        setLastVoiceReply(replyText);
        void speak(replyText, replyIndex, true);
      }
      const proposed: ProposedAction[] = Array.isArray(body?.proposedActions) ? body.proposedActions : [];
      if (proposed.length > 0) {
        setActions((prev) => [
          ...prev,
          ...proposed.map((a) => ({ ...a, id: `a${actionSeq++}`, status: "pending" as const })),
        ]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error del copiloto");
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: "Ocurrió un error al procesar tu solicitud." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction(action: PendingAction) {
    setActions((prev) => prev.map((a) => (a.id === action.id ? { ...a, status: "running" } : a)));
    try {
      const res = await fetch("/api/ai/copilot/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: action.type, params: action.params }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "No se pudo ejecutar la acción.");
      setActions((prev) => prev.map((a) => (a.id === action.id ? { ...a, status: "done" } : a)));
      toast.success(body?.message ?? "Acción realizada");
    } catch (err) {
      setActions((prev) => prev.map((a) => (a.id === action.id ? { ...a, status: "pending" } : a)));
      toast.error(err instanceof Error ? err.message : "No se pudo ejecutar la acción");
    }
  }

  function cancelAction(id: string) {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
  }

  function resetChat() {
    if (loading) return;
    stopAudio();
    setTurns([]);
    setActions([]);
    setInput("");
    void fetch("/api/ai/copilot/history", { method: "DELETE" }).catch(() => {});
  }

  async function startRecording() {
    if (loading || transcribing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        void transcribe(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      toast.error("No se pudo acceder al micrófono. Revisa los permisos.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  // Timer de "Conversación activa" del tab Voz — cuenta los segundos
  // desde que arrancó la grabación en curso. Se reinicia a 0 en cuanto
  // deja de grabar (no persiste entre notas de voz distintas).
  useEffect(() => {
    if (!recording) {
      setRecordingElapsedSec(0);
      return;
    }
    const startedAt = Date.now();
    const id = setInterval(() => {
      setRecordingElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [recording]);

  // Toggle de tap (no hold) para el botón grande del tab Voz — pantalla
  // dedicada, así que un tap para empezar y otro para detener se siente
  // mejor que mantener presionado un círculo de 96px.
  function handleVoiceModeToggle() {
    if (transcribing) return;
    if (recording) stopRecording();
    else void startRecording();
  }

  // Mantener presionado para grabar (no dos toques) — Pointer Events
  // cubren mouse/touch/lápiz con un solo set de handlers. Se captura el
  // puntero al presionar para que soltar el dedo FUERA de los límites
  // del botón (un desliz natural con guantes) siga contando como
  // "soltar" en vez de perder el evento — sin esto haría falta también
  // un onPointerLeave que corta la grabación de golpe si el dedo se
  // resbala un poco.
  function handleMicPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (loading || transcribing || recording) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    void startRecording();
  }
  function handleMicPointerUp() {
    if (recording) stopRecording();
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }

  async function speak(text: string, id: number, silent = false) {
    if (playingId === id) {
      stopAudio();
      return;
    }
    stopAudio();
    setTtsBusyId(id);
    try {
      const res = await fetch("/api/ai/copilot/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error ?? "No se pudo generar el audio.");
      }
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingId(null);
        audioRef.current = null;
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlayingId(null);
        audioRef.current = null;
        URL.revokeObjectURL(url);
      };
      setPlayingId(id);
      await audio.play();
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : "Error al reproducir");
    } finally {
      setTtsBusyId(null);
    }
  }

  async function transcribe(blob: Blob) {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "audio.webm");
      const res = await fetch("/api/ai/copilot/transcribe", { method: "POST", body: fd });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "No se pudo transcribir el audio.");
      const text = (body?.text ?? "").trim();
      if (!text) {
        toast.error("No se detectó voz en el audio.");
        return;
      }
      // Estilo WhatsApp: se envía como nota de voz (audio reproducible +
      // su transcripción como pie), no solo texto en el input.
      const audioUrl = URL.createObjectURL(blob);
      void send(text, audioUrl);
      // El historial queda visible en ambos modos (ver return más
      // abajo), así que no hace falta forzar la vuelta a "chat" — la
      // respuesta aparece en el hilo sin salir de la banda de voz.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al transcribir");
    } finally {
      setTranscribing(false);
    }
  }

  // Reproduce una nota de voz del médico (blob local), reutilizando el
  // mismo control de reproducción que la voz de Zen.
  function playClip(url: string, id: number) {
    if (playingId === id) {
      stopAudio();
      return;
    }
    stopAudio();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => {
      setPlayingId(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingId(null);
      audioRef.current = null;
    };
    setPlayingId(id);
    void audio.play().catch(() => setPlayingId(null));
  }

  const empty = turns.length === 0;

  if (profileLoading) {
    return (
      <div className="flex h-[55vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!onboarded || editingProfile) {
    return (
      <CopilotOnboarding
        mode={onboarded ? "edit" : "onboarding"}
        initial={profileData}
        onSaved={() => {
          const wasOnboarding = !onboarded;
          setEditingProfile(false);
          void loadProfile().then((p) => {
            if (wasOnboarding) seedGreeting(p);
          });
        }}
        onCancel={editingProfile ? () => setEditingProfile(false) : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <CopilotIntroCard
        showReset={!empty}
        onReset={resetChat}
        onEditPreferences={() => setEditingProfile(true)}
      />

      {/* Vista única y excluyente: "Voz" muestra el orbe (abajo),
          "Chat" muestra este historial — nunca los dos apilados. El
          historial no se pierde (sigue en `turns`, persistido en la
          base), solo deja de ser visible mientras estás en "Voz". */}
      {mode === "chat" && (
      <div
        ref={scrollRef}
        className="h-[45vh] min-h-[260px] space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-4"
      >
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="size-8 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Soy {COPILOT_NAME}, tu asistente. Puedo consultar citas, conversaciones, pacientes y
              negocios, y proponer acciones (registrar pacientes, agendar, enviar WhatsApp, mover un
              negocio, notas) que tú confirmas.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn, i) =>
            turn.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                  {turn.audioUrl ? (
                    <button
                      type="button"
                      onClick={() => playClip(turn.audioUrl as string, i)}
                      className="flex items-center gap-2.5"
                      aria-label="Reproducir nota de voz"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
                        {playingId === i ? (
                          <Square className="size-4" />
                        ) : (
                          <Play className="size-4" />
                        )}
                      </span>
                      <span className="font-medium">Nota de voz</span>
                    </button>
                  ) : null}
                  {turn.content ? (
                    <div
                      className={
                        turn.audioUrl
                          ? "mt-1.5 whitespace-pre-wrap text-xs text-primary-foreground/90"
                          : "whitespace-pre-wrap"
                      }
                    >
                      {turn.content}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="flex max-w-[85%] flex-col items-start gap-1">
                  <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm text-foreground">
                    {renderRich(turn.content)}
                  </div>
                  {turn.content.trim() ? (
                    <button
                      type="button"
                      onClick={() => speak(turn.content, i)}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
                    >
                      {ttsBusyId === i ? (
                        <>
                          <Loader2 className="size-3 animate-spin" /> Generando…
                        </>
                      ) : playingId === i ? (
                        <>
                          <Square className="size-3" /> Detener
                        </>
                      ) : (
                        <>
                          <Volume2 className="size-3" /> Escuchar
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            ),
          )
        )}

        {/* Tarjetas de acción propuesta (confirmación humana) */}
        {actions
          .filter((a) => a.status !== "cancelled")
          .map((action) => (
            <div
              key={action.id}
              className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
                    Acción propuesta
                  </p>
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
                  <Button
                    size="sm"
                    onClick={() => confirmAction(action)}
                    disabled={action.status === "running"}
                  >
                    {action.status === "running" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelAction(action.id)}
                    disabled={action.status === "running"}
                  >
                    <X className="size-4" /> Cancelar
                  </Button>
                </div>
              ) : null}
            </div>
          ))}

        {loading ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3.5">
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60" />
            </div>
          </div>
        ) : null}
      </div>
      )}

      {/* Banda de voz — vista principal por defecto ("Voz"). Al
          cambiar a "Chat" se reemplaza por el historial de arriba,
          nunca los dos a la vez. */}
      {mode === "voz" && (
        <CopilotVoiceMode
          recording={recording}
          transcribing={transcribing}
          thinking={loading}
          speaking={ttsBusyId !== null || playingId !== null}
          replyText={lastVoiceReply}
          elapsedSec={recordingElapsedSec}
          onToggleRecording={handleVoiceModeToggle}
          onStopSpeaking={stopAudio}
          onClose={() => setMode("chat")}
        />
      )}

      {/* "Zen · Copiloto clínico" + switch Voz/Chat — debajo de la
          banda/historial, justo arriba del composer, como en el
          mockup (no arriba de todo). */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" />
          {COPILOT_NAME} · Copiloto clínico
        </span>
        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/60 p-0.5">
          <button
            type="button"
            onClick={() => setMode("voz")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              mode === "voz" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mic className="size-3.5" /> Voz
          </button>
          <button
            type="button"
            onClick={() => setMode("chat")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              mode === "chat" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Send className="size-3.5" /> Chat
          </button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          disabled={loading || recording}
          placeholder={recording ? "Grabando… suelta el micrófono para transcribir" : "Escribe o dicta tu mensaje…"}
          className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none disabled:opacity-60"
        />
        <Button
          type="button"
          variant={recording ? "destructive" : "outline"}
          onPointerDown={handleMicPointerDown}
          onPointerUp={handleMicPointerUp}
          onPointerCancel={handleMicPointerUp}
          disabled={loading || transcribing}
          // size-14 (~56px), alcanzable con el pulgar y con guantes —
          // "cada pantalla cierra con un botón de ~54px" del assessment
          // UX/UI aplicado aquí, sin tocar el resto de los controles.
          className="size-14 shrink-0 touch-none rounded-full"
          title={recording ? "Suelta para transcribir y enviar" : "Mantén presionado para dictar"}
          aria-label={recording ? "Grabando — suelta para enviar" : "Mantén presionado para dictar por voz"}
        >
          {transcribing ? (
            <Loader2 className="size-5 animate-spin" />
          ) : recording ? (
            <Square className="size-5" />
          ) : (
            <Mic className="size-5" />
          )}
        </Button>
        <Button type="submit" disabled={loading || recording || !input.trim()} className="h-11 shrink-0">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
