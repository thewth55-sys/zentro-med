# Lecciones para Qwen en este repo (zentro-med)

Errores concretos que Qwen (qwen2.5-coder:14b) ya cometió al generar
código para este repo, verificados con tsc/eslint por Claude. Léelos
antes de generar código — evita repetirlos.

1. **`requireRole` NO recibe `request`.** Firma real:
   `requireRole(min: 'viewer' | 'agent', options?: { allowSuspended?: boolean }): Promise<AccountContext>`
   de `@/lib/auth/account`. Solo `requireSectionAccess(min, section, request)`
   (de `@/lib/auth/section-access`) recibe `request` como tercer
   argumento — son funciones distintas, no mezcles sus firmas.
   Error real que causó: `TS2559: Type 'Request' has no properties in
   common with type '{ allowSuspended?: boolean }'`.

2. **No existe un barrel `@/components/ui`.** Cada componente de UI
   vive en su propio archivo: `@/components/ui/button`,
   `@/components/ui/card`, `@/components/ui/select`, etc. Nunca
   importes varios desde `"@/components/ui"` a secas — no existe ese
   índice.

3. **Este repo usa named exports para componentes de feature**, no
   `export default`. Patrón: `export function AdminLandingEditor(...)`
   + `import { AdminLandingEditor } from "..."`. Si generas un
   componente con `export default`, el archivo que lo importa (que tú
   mismo generas en la misma tarea) DEBE usar `import Foo from "..."`
   a juego — pero mejor: usa siempre named export para que coincida
   con el resto del repo.

4. **Next.js de este repo tiene los `params` de rutas dinámicas como
   `Promise`** (rompe con lo que sabes de versiones anteriores de
   Next.js — hay un aviso explícito de esto en `AGENTS.md` del repo).
   Firma correcta de un route handler con segmento dinámico:
   ```ts
   export async function PATCH(
     request: Request,
     { params }: { params: Promise<{ id: string }> },
   ) {
     const { id } = await params;
     ...
   }
   ```
   NUNCA uses `{ params }: { params: { id: string } }` sin `Promise`.

5. **No fusiones dos acciones de usuario distintas en un solo
   diálogo/handler solo porque se ven parecidas.** Ejemplo real: se
   pidió un botón "Rechazar" (cambia status a rejected + guarda motivo)
   y un botón separado "Dar observaciones" (solo guarda un comentario,
   sin tocar el status) — Qwen los fusionó en un solo `Dialog` que
   siempre llamaba al handler de "comentario", así que "Rechazar" nunca
   cambiaba el status. Si dos acciones tienen efectos distintos en la
   base de datos, dales estado y handlers separados aunque compartan
   UI (ej. un `mode: 'reject' | 'feedback'` que decide qué handler se
   llama al enviar, no un solo handler fijo).

6. **Al corregir errores de tsc/eslint en una ronda de feedback, vuelve
   a mandar TODOS los archivos que siguen existiendo**, no solo los
   que tenían el error nuevo. Si omites un archivo que ya habías
   generado, se interpreta como que ya no forma parte de la respuesta
   — puede provocar que se reintente escribir esa lógica en el lugar
   equivocado (pasó: un handler PATCH pensado para
   `[id]/route.ts` se re-generó por error dentro de `route.ts`, el
   archivo de listado, que no tiene segmento dinámico `[id]` y nunca
   recibiría ese parámetro).

7. **Tipa explícitamente los `useState` cuyo valor inicial no revela
   el tipo completo** — usa `useState<string | null>(null)`,
   `useState<MiTipo[]>([])`, etc. `useState(null)` o `useState([])`
   sin genérico causa errores de tsc (`any` implícito / tipo `never`)
   en el resto del componente.
