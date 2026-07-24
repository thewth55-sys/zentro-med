@AGENTS.md

# Zentro Med

Multi-tenant, paid-SaaS WhatsApp CRM/EHR for clinics — self-serve
signup, Stripe subscription billing (trial/standalone/Zentro Salud
Starter/Pro plan tiers), full clinical feature set (odontogram, visit
photos, patient records), platform-admin console at `/admin`.

## Related project

There is a **sister fork**, `Zuhma Med CRM`
(`/Users/oswaldogarcia/Documents/zuhma-med-crm`, separate GitHub repo
`github.com/thewth55-sys/zuhma-med-crm`) — same codebase at the point
it was forked, but stripped of Stripe billing/plan tiers (offered free
as a value-add to Zuhma's own clients instead), the odontogram, admin
coupons, the Zoho Desk widget, and the per-account website builder;
rebranded with Zuhma's coral theme; accounts are created by a platform
admin instead of public self-serve signup. Treat the two as
**independent codebases going forward** — a fix or feature built here
does not automatically apply there, and vice versa. If a change should
land in both, it needs to be ported deliberately.

Keep this project's own context (architecture notes, current
initiatives, known issues) below as it comes up in future sessions.
