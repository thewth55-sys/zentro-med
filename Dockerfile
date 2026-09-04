FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Only NEXT_PUBLIC_* vars are declared here on purpose — those are the
# only ones Next.js actually needs during `next build` (it inlines
# them into the client JS bundle at compile time; nothing else reads
# `process.env` during the build). Every real secret this app uses
# (SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY, STRIPE_SECRET_KEY,
# META_APP_SECRET, RESEND_API_KEY, BILLING_CRON_SECRET, the
# STRIPE_PRICE_* ids, SENTRY_DSN/ORG/PROJECT/AUTH_TOKEN, ...) used to
# be passed as build ARGs too, which is a real exposure: every `ARG`/
# `ENV` in a Dockerfile gets written in plaintext into that build
# stage's image layer, readable by anyone with access to the build
# host's Docker daemon (`docker history`, inspecting the layer cache) —
# completely independent of Supabase RLS or the AES-256-GCM encryption
# this app uses for clients' own stored credentials.
#
# The `runner` stage below never re-declares any of those — Easypanel
# already has to inject them as RUNTIME container env vars for the
# app to work at all (nothing in this Dockerfile sets ENCRYPTION_KEY
# etc. on the production image), so removing them here drops zero
# functionality: they simply stop existing anywhere in the image
# itself, only living in the running container's memory.
#
# Sentry's org/project/auth-token were the one plausible reason a
# secret might legitimately be needed at build time (source-map
# upload authenticates against Sentry's API during `next build`) —
# moot here, since `sourcemaps: { disable: true }` in next.config.ts
# already turns that off for memory reasons (see that file's comment).
# If sourcemap upload is ever re-enabled, SENTRY_ORG/SENTRY_PROJECT/
# SENTRY_AUTH_TOKEN would need to come back here specifically for that.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_META_APP_ID
ARG NEXT_PUBLIC_META_WA_SIGNUP_CONFIG_ID
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_LOCALE
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_FIREBASE_PUSH_ENABLED

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_META_APP_ID=$NEXT_PUBLIC_META_APP_ID
ENV NEXT_PUBLIC_META_WA_SIGNUP_CONFIG_ID=$NEXT_PUBLIC_META_WA_SIGNUP_CONFIG_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_LOCALE=$NEXT_PUBLIC_APP_LOCALE
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_FIREBASE_PUSH_ENABLED=$NEXT_PUBLIC_FIREBASE_PUSH_ENABLED

# Caps V8's heap during `next build`. Without this, V8 tries to grow
# memory unbounded on a constrained host; the kernel OOM-kills the
# process with NO error output at all (the build just stops dead —
# at "Running TypeScript ...", "Creating an optimized production
# build ...", or "Collecting page data ...", same signature, just a
# different point in the pipeline depending on what's heaviest that
# build), which is what happened repeatedly on this VPS as the
# codebase's build weight grew (Sentry, then the Puck-based landing
# builder). History: 1536 → 2048 (Sentry) did not fix it alone;
# disabling Sentry sourcemaps, webpack's persistent cache, and the
# TypeScript check all reduced the WORK done and helped, but the
# build still hung at "Collecting page data" with 2 parallel workers.
# Previous cap raises alone never fixed anything, because with
# multiple parallel workers the SUM of their heaps could still exceed
# the container's real memory regardless of each one's individual
# cap. next.config.ts forces `experimental.cpus: 1`, which removes
# SIBLING workers contending with each other — but it does NOT mean
# only one Node process is alive during "Collecting page data" /
# "Generating static pages": Next spawns that one worker as a CHILD
# of the main `next build` process, which stays resident (and, with
# webpack's cache disabled, still holding whatever it hasn't
# GC'd from compiling) while the worker runs. NODE_OPTIONS is
# inherited by the child, so BOTH processes could independently grow
# toward this same cap — raising it to "map directly to usable
# memory" assumed a single process and silently doubled the real
# ceiling instead. Confirmed this host has 4GB total. 2 processes ×
# 2560MB each could reach ~5GB combined, over the real limit — which
# is consistent with the build hanging at exactly this phase even
# after that raise. Lowered so 2 processes at cap (~3GB) leaves ~1GB
# for the OS/container overhead instead of assuming only one process
# is ever resident.
#
# Lowered again 2026-07-16: the codebase grew enough (AI agenda tool
# calling batch) that 1536MB × 2 processes hung at this same phase a
# second time. This value isn't a one-time constant — it needs
# revisiting as the app grows, since the real constraint is the fixed
# 4GB container ceiling, not this number. If it recurs again, the more
# durable fix is raising the container's actual memory limit rather
# than continuing to shrink this cap toward the point a single
# process can't fit the build at all. Verified locally that a full
# build still completes at this value before lowering.
# Override via the NODE_BUILD_MEMORY_MB build arg.
ARG NODE_BUILD_MEMORY_MB=1024
ENV NODE_OPTIONS=--max-old-space-size=${NODE_BUILD_MEMORY_MB}

# Build the project
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Disable telemetry during runtime
ENV NEXT_TELEMETRY_DISABLED=1
# The `nextjs` system user (added below) has no real home directory by
# default — harmless for Next.js itself, but the Infisical CLI writes
# a small config/cache under $HOME on login. /app is already owned by
# nextjs:nodejs (see the --chown COPY below), so point HOME there
# instead of leaving it unset/unwritable.
ENV HOME=/app

# Infisical CLI — only used by docker-entrypoint.sh, and only when the
# three INFISICAL_* vars are actually set (see that script). Installed
# unconditionally so the image is ready the moment those vars get
# added in Easypanel, without needing a rebuild at cutover time.
# Alpine-specific install (musl, not glibc) — the deb/rpm installers
# Infisical documents elsewhere don't apply here. Root at this point
# in the build (before `USER nextjs` below), so no `sudo` needed.
RUN apk add --no-cache bash wget && \
    wget -qO- 'https://artifacts-cli.infisical.com/setup.apk.sh' | sh && \
    apk update && apk add --no-cache infisical

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output.
# docker-entrypoint.sh decides whether to run it through Infisical or
# plain — see that script.
CMD ["/app/docker-entrypoint.sh"]
