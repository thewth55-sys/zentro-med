# Zentro Med — Traspaso de contexto (2026-09-17)

Este documento resume el estado del proyecto para que otro agente
(DeepSeek u otro) pueda seguir trabajando sin repetir descubrimientos
ya hechos. Pégalo completo como primer mensaje si el harness no lo lee
automáticamente.

## Qué es el proyecto

Zentro Med: SaaS multi-tenant de WhatsApp CRM/EHR para consultorios
médicos/dentales — Next.js 16 + Supabase, self-serve con Stripe
(prueba/planes Standalone/Zentro Salud Starter/Pro), panel de
plataforma-admin en `/admin`. Repo: GitHub `thewth55-sys/zentro-med`,
espejado a Gitea `zentro-gitea.b4jshi.easypanel.host`. Hospedado en
Easypanel/VPS. Ver `CLAUDE.md`/`AGENTS.md` en la raíz para lo que ya
está documentado ahí — no lo dupliques, solo tenlo en cuenta.

Hay un fork hermano, `Zuhma Med CRM`, en
`/Users/oswaldogarcia/Documents/zuhma-med-crm` — código base
compartido en el punto del fork, pero **tratado como codebase
independiente de aquí en adelante**. Un cambio aquí no se propaga solo.

## Reglas de trabajo que hay que seguir (no negociables)

- **Nunca aplicar una migración de Supabase directamente.** Siempre dar
  el SQL exacto (vía `pbcopy` si es posible) y esperar a que el usuario
  confirme que ya la corrió ("listo"/"ya corrí la migración").
- **Nunca hacer commit o push sin pedir permiso explícito y esperar un
  "sí" claro** — para cada uno por separado (commit y push son
  confirmaciones distintas).
- Los commits van a **ambos remotos**: `git push origin main && git
  push gitea main`.
- Verificar todo cambio de código con `npx tsc --noEmit`, `npx eslint
  <archivos tocados>`, y `npx vitest run` antes de darlo por terminado.
- Antes de una migración/PR con diff de `supabase config push`, revisar
  el diff completo — pushea la sección `[auth]` entera, no solo lo
  declarado en `config.toml`.
- Nunca elegir un proveedor externo que reciba PII de usuarios (ej.
  geo-IP, analítica) sin aprobación explícita primero.

## Bug recurrente a revisar primero ante fallas de auth

Infisical le agrega un `\` (backslash) al final de algunos valores de
secretos al sincronizar — ya pasó con OpenAI, ElevenLabs y Google
OAuth. Si algo de auth falla de la nada, revisar esto antes que nada.

## Zoho CRM — leads (distinto de Zoho Campaigns, hecho en otra conversación)

Aparte de todo lo de Zoho Campaigns (abajo), hay una integración
**separada e independiente** con **Zoho CRM** para llevar leads
comerciales — se hizo en otra conversación/sesión, sin overlap de
código con Campaigns salvo que ambas reusan
`dispatchPlatformWebhookEvent`. 4 PRs mergeados a `main` (ambos
remotos, ya resincronizados a `1a488b0` el 2026-09-17):

- **PR #1** — cada prueba gratis nueva se manda a Zoho CRM como Lead
  (`src/lib/crm/zoho-lead.ts`, hook en
  `src/app/api/internal/webhooks/new-account/route.ts` — el mismo
  webhook de Supabase que ya dispara `account.created` para Campaigns).
- **PR #2** — botón "Sincronizar con Zoho CRM" en `/admin/accounts`
  para hacer backfill de las cuentas que ya existían antes de este
  feature (`src/app/api/platform-admin/zoho-crm/backfill-leads/route.ts`,
  `src/components/admin/sync-zoho-crm-dialog.tsx`).
- **PR #3** — el backfill falla rápido si el refresh token de Zoho es
  inválido, en vez de seguir intentando.
- **PR #4** — la ruta ya no responde 502 cuando Zoho falla (el reverse
  proxy de EasyPanel/Traefik intercepta 502 y lo reemplaza con su
  propia página HTML de error, ocultando el mensaje real) — ahora
  responde 500 y loguea el error real; el diálogo del admin distingue
  "el servidor dijo X" de "respuesta no reconocida, revisa logs".

Nuevo módulo compartido: `src/lib/integration-errors/log.ts` (log
estructurado de errores de integraciones externas, usado por el
backfill de Zoho CRM — revisar si aplica reusarlo en Zoho Campaigns).

**Nota de proceso**: esta integración se pusheó en su momento solo a
Gitea, no a GitHub — los dos remotos se desincronizaron por varios
commits hasta que se detectó y resincronizó el 2026-09-17. Si sigues
trabajando desde otro agente/harness, **verifica siempre que
`git log origin/main` y `git log gitea/main` coincidan** antes de
asumir que "ya está en el repo" — no confíes en el reporte de otra
sesión sin comprobarlo con `git fetch` en ambos remotos primero.

## Trabajo reciente (completado y ya en producción, este mes)

En orden cronológico aproximado:

1. **Roles/permisos custom** — tope de 2 admins + "perfiles" por
   sección (billing/banking/inventory/agenda vía API; pacientes vía
   RLS desde 2026-09-13).
2. **Colaboradores externos** — acceso cross-tenant con alcance
   limitado (no multi-membresía, eso sigue bloqueado). Nueva rama RLS
   `is_account_collaborator()` en 7 tablas.
3. **4 fases de fixes de QA** — a partir de un reporte PDF de una
   clínica real. Planes de pago y CFDI quedaron **fuera de alcance**
   explícitamente.
4. **Herramienta de sandbox CFDI (factura.com)** — smoke-test en
   `/admin/facturacom-test`. La integración real de facturación **no**
   está construida, solo el sandbox de prueba.
5. **Rediseño completo de correos** — sistema de 3 "shells"
   (zen/interno/paciente) en `src/lib/email/branded-template.ts` +
   builders de bloques (`pText`, `pBoton`, `pTabla`, etc.). 18 correos
   existentes migrados + 5 nuevos (bienvenida, invitación de equipo
   por correo, pago fallido, prueba por terminar, canal de correo con
   opt-out). Incluye tracking de apertura/entrega vía webhook de
   Resend, reusando la escalera de status de WhatsApp
   (sent→delivered→read).
6. **Zoho Campaigns — 6 disparadores de lifecycle marketing B2B**
   (a clínicas, no a pacientes) — ver sección aparte abajo, es el
   trabajo más grande y con más aprendizajes no obvios.
7. **Landing page** — 2 secciones nuevas: app móvil + Google Calendar
   (marcada "Próximamente", sin apps reales publicadas todavía) e
   integraciones de pago (Clip, Mercado Pago, Stripe con sus logos
   reales). También se corrigió un bug preexistente (no relacionado)
   de texto oscuro sobre fondo oscuro en la sección "Conoce a Zen".

## Zoho Campaigns / Zoho Flow — el bloque grande, con gotchas reales

**Arquitectura**: Zentro Med calcula "cuándo" (cron diario en
`src/app/api/campaign-triggers/cron/route.ts`) y dispara un webhook
saliente (`src/lib/webhooks/`) → Zoho Flow lo recibe → actualiza/crea
el contacto en Zoho Campaigns → un workflow de Zoho (trigger de
"Actualización de campo") manda el correo real.

**Gotcha de arquitectura importante ya resuelto**: `webhook_endpoints`
está diseñado por-tenant (`account_id` de cada clínica). Para que un
webhook que Zentro Labs registra bajo SU PROPIA cuenta reciba eventos
sobre TODAS las clínicas, se agregó `dispatchPlatformWebhookEvent()`
(`src/lib/webhooks/deliver.ts`) — busca endpoints bajo un
`PLATFORM_WEBHOOK_ACCOUNT_ID` fijo (env var) en vez de la cuenta de la
clínica del evento. Se usa para los 6 eventos `campaign_trigger.*` y
para `account.created` (nuevo, dispara en tiempo real desde
`src/app/api/internal/webhooks/new-account/route.ts` para que cada
cliente nuevo entre solo a Zoho Campaigns sin importación manual).

**Gotchas de Zoho específicamente** (ver también la memoria de Claude
en `feedback_zoho_campaigns_flow_gotchas.md` si tienes acceso a ella —
si no, aquí está lo esencial):

- La sintaxis real de merge tag de campo personalizado en Zoho
  Campaigns es **`$[UD:NOMBRE_CAMPO||]$`** (mayúsculas, con `||` antes
  del cierre) — NO `${campo}`. Esto último se manda literal sin
  sustituir, sin error ni warning.
- "Add or update contact" identifica por **correo electrónico**, no
  por ningún campo personalizado.
- Un trigger de "Actualización de campo" solo dispara **una vez por
  contacto** salvo que actives "Habilite el reingreso de contactos al
  flujo de trabajo" en ⚙️ Configuración del workflow — sin esto,
  pruebas repetidas (o un cliente que vuelve a calificar meses
  después) nunca vuelven a disparar el correo.
- Un campo de fecha necesita el valor de **"Current datetime"** del
  panel de variables del sistema, no "Current date" — el de solo fecha
  tiende a corromperse en la conversión de formato.
- Zoho Flow no puede indexar un arreglo JSON (`examples[0]`, etc.) —
  hay que mandar campos planos y nombrados (`example1Name`,
  `example2Name`, etc.) en el payload en vez de un array.

**Estado actual — 6 de 12 correos originales**:
- ✅ **Construidos, probados de punta a punta, en producción**: R1
  (agenda vacía), R2 (presupuestos detenidos), R4 (último correo), I1
  (enciende a Zen), I2 (cobra sin terminal), I4 (tu primer mes).
- 🟡 **En progreso, sin terminar**: M1 (venta cruzada de Marketing,
  contenido genérico) y M2 (bienvenida a Marketing, también genérico
  según confirmó el usuario) — se estaba armando un workflow separado
  en Zoho Campaigns tipo "secuencia de goteo": trigger "Entrada de
  lista" (lista "Zentro Med") → esperar 7 días → enviar M1 → esperar
  hasta día 30 → enviar M2. **Quedó a medias** — se creó el trigger y
  se identificó el paso "Tiempo de espera", pero no se confirmó que la
  secuencia completa (los 2 pasos de espera + los 2 "Alerta de correo"
  con el HTML de M1/M2) se haya terminado de armar ni activado. Los
  HTML finales de M1 y M2 sí quedaron listos (con logos y links
  reales) — buscar `09-M1-tardes-vacias-final.html` y
  `10-M2-arranca-tu-campana-final.html` en el scratchpad de la sesión
  de Claude si siguen ahí, o pedirle al usuario que los comparta de
  nuevo si no.
- ❌ **Sin empezar, necesitan trabajo de producto/datos antes de
  poder construirse**:
  - **R3** — necesita trackear "última vez que se abrió la bandeja de
    WhatsApp", dato que hoy no existe en ningún lado.
  - **I3** — vende una función de "reactivación de pacientes 90+ días
    inactivos" que **no existe en el producto todavía** — hay que
    construir la feature antes que el trigger.
  - **M3** (reporte de campaña con cifras de ROI) y **M4** (reactivar
    campaña pausada) — ambos necesitan **atribución completa UTM →
    cita → ingreso**, que hoy no existe (`contacts`/`appointments` no
    tienen columnas UTM; solo se manda 3 eventos fijos a Meta CAPI, sin
    guardar atribución). Es un proyecto de datos aparte, más grande
    que todo el trabajo de Zoho junto. **M2 originalmente parecía
    depender de esto también, pero se confirmó que su contenido es
    genérico — no lo necesita.**
  - Pendiente también, aparte de los correos: **importar a los
    clientes YA existentes** a la lista "Zentro Med" de Zoho Campaigns
    (los nuevos entran solos desde `account.created`, pero los
    históricos necesitan un CSV manual — se le dieron instrucciones al
    usuario, no se confirmó que lo haya hecho).

## Otro trabajo discutido pero SIN código escrito todavía

- **Dashboard de analítica con PostHog en `/admin`** — se investigó
  la integración actual (autocaptura + pageviews manuales +
  identify/group ya activos, cero uso de PostHog del lado del
  servidor). Se propuso un plan: nueva página `/admin/analitica` con 3
  bloques (uso por página/sección, actividad en tiempo real, embudos
  de fricción/abandono) — el tercero necesita instrumentar eventos
  nombrados en 2-3 flujos clave primero (no existen hoy, solo hay
  clics genéricos autocapturados). El patrón a seguir para un widget
  de admin respaldado por una API externa ya existe:
  `src/app/admin/facturacom-test/page.tsx` +
  `POST /api/platform-admin/facturacom/test-cfdi`. Ninguna línea de
  código de esto se ha escrito — es solo un plan aprobado
  conceptualmente por el usuario, esperando que se retome.

## Convenciones de diseño de la landing (`src/app/page.tsx`)

Contenido en `src/app/landing-content.ts` (un solo string HTML gigante,
renderizado con `dangerouslySetInnerHTML`), estilos en
`src/app/landing.css`, todo bajo la clase `.zm-landing` — **no** usa
el sistema Tailwind del resto de la app. Paleta: verde `#0E7C4A`
(`--zm-g3`), tinta `#0C1B14`, fondo claro `#F7F9F8`
(`--zm-surface`), panel oscuro `linear-gradient(160deg,#0F241A,#164A31)`
(`--zm-dark-panel`, usado en pocas secciones "flagship"). Fuente
Schibsted Grotesk (títulos/cuerpo) + IBM Plex Mono (micro-labels tipo
`// 08 — ...`). Convención de secciones numeradas secuencialmente
(`// 01 —` a `// 11 —` actualmente) — si agregas/quitas una sección,
renumera las siguientes.

## Siguiente paso más obvio si retomas

Terminar la secuencia M1→M2 en Zoho Campaigns (es la pieza más cercana
a estar lista), y confirmar con el usuario si ya importó a sus
clientes existentes a la lista de Zoho.
