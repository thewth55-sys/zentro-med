/** Ya trae puntuación de cierre — no le agrega una encima. */
function endsWithClosingPunctuation(s: string): boolean {
  return /[.!?:;,]$/.test(s)
}

/** Limpia el texto para la lectura por voz: quita emojis y markdown (para
 *  que la voz no lea "asterisco asterisco" ni describa los emojis) y
 *  convierte viñetas en una enumeración hablada natural en vez de dejar
 *  saltos de línea desnudos — el modelo escribe "- citas\n- pacientes"
 *  pensando en texto, y leído tal cual (solo quitando el guion) suena
 *  entrecortado porque el TTS no tiene ninguna pausa/puntuación entre
 *  ítems. Aquí cada grupo de viñetas seguidas se une con comas y un "y"
 *  final, como si alguien lo dijera en voz alta. */
export function stripForSpeech(text: string): string {
  const cleaned = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .trim()

  const sentences: string[] = []
  let bulletGroup: string[] = []

  const flushBulletGroup = () => {
    const items = bulletGroup.filter(Boolean)
    bulletGroup = []
    if (items.length === 0) return
    const joined = items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
    sentences.push(endsWithClosingPunctuation(joined) ? joined : `${joined}.`)
  }

  for (const rawLine of cleaned.split('\n')) {
    const line = rawLine.trim()
    const bulletMatch = /^[-•]\s*(.*)$/.exec(line)
    if (bulletMatch) {
      bulletGroup.push(bulletMatch[1].trim())
      continue
    }
    flushBulletGroup()
    if (line) sentences.push(endsWithClosingPunctuation(line) ? line : `${line}.`)
  }
  flushBulletGroup()

  return sentences.join(' ').replace(/[ \t]{2,}/g, ' ').trim()
}
