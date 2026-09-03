// Whisper tiene un artefacto conocido: con audio corto/silencioso o con
// ruido de fondo, en vez de devolver texto vacío "alucina" créditos de
// subtitulado que aprendió del set de entrenamiento (subtítulos de
// YouTube/Amara.org). No es una transcripción real — si el texto
// coincide con alguno de estos patrones, se trata igual que "no se
// detectó voz" en vez de mandarlo al copiloto como si el médico lo
// hubiera dictado.
const WHISPER_HALLUCINATION_PATTERNS = [
  /subt[ií]tulos? (realizados?|hechos?|creados?) por la comunidad/i,
  /subtitles? by the amara\.org community/i,
  /amara\.org/i,
  /gracias por ver (el|este) v[ií]deo/i,
  /suscr[ií]bete/i,
  /www\.mooji\.org/i,
]

export function isWhisperHallucination(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return WHISPER_HALLUCINATION_PATTERNS.some((p) => p.test(trimmed))
}
