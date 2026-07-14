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

# Expose build arguments for env variables (required by Next.js at build time)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG ENCRYPTION_KEY
ARG META_APP_SECRET
ARG META_APP_ID
ARG NEXT_PUBLIC_META_APP_ID
ARG NEXT_PUBLIC_META_WA_SIGNUP_CONFIG_ID
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_LOCALE
ARG STRIPE_SECRET_KEY
ARG STRIPE_WEBHOOK_SECRET
ARG STRIPE_PRICE_STANDALONE_BASE
ARG STRIPE_PRICE_STANDALONE_SEAT
ARG STRIPE_PRICE_ZENTRO_SALUD_STARTER
ARG STRIPE_PRICE_ZENTRO_SALUD_PRO
ARG STRIPE_PRICE_SEAT_ADDON
ARG BILLING_CRON_SECRET
ARG CAL_COM_WEBHOOK_SECRET
ARG RESEND_API_KEY
ARG RESEND_FROM_EMAIL
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_DSN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN

# Inject build arguments as environment variables for next build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV ENCRYPTION_KEY=$ENCRYPTION_KEY
ENV META_APP_SECRET=$META_APP_SECRET
ENV META_APP_ID=$META_APP_ID
ENV NEXT_PUBLIC_META_APP_ID=$NEXT_PUBLIC_META_APP_ID
ENV NEXT_PUBLIC_META_WA_SIGNUP_CONFIG_ID=$NEXT_PUBLIC_META_WA_SIGNUP_CONFIG_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_LOCALE=$NEXT_PUBLIC_APP_LOCALE
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
ENV STRIPE_PRICE_STANDALONE_BASE=$STRIPE_PRICE_STANDALONE_BASE
ENV STRIPE_PRICE_STANDALONE_SEAT=$STRIPE_PRICE_STANDALONE_SEAT
ENV STRIPE_PRICE_ZENTRO_SALUD_STARTER=$STRIPE_PRICE_ZENTRO_SALUD_STARTER
ENV STRIPE_PRICE_ZENTRO_SALUD_PRO=$STRIPE_PRICE_ZENTRO_SALUD_PRO
ENV STRIPE_PRICE_SEAT_ADDON=$STRIPE_PRICE_SEAT_ADDON
ENV BILLING_CRON_SECRET=$BILLING_CRON_SECRET
ENV CAL_COM_WEBHOOK_SECRET=$CAL_COM_WEBHOOK_SECRET
ENV RESEND_API_KEY=$RESEND_API_KEY
ENV RESEND_FROM_EMAIL=$RESEND_FROM_EMAIL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV SENTRY_DSN=$SENTRY_DSN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

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
# cap. Now that next.config.ts forces `experimental.cpus: 1` (fully
# serial, no sibling workers), that multiplication problem is gone,
# so raising this single worker's cap should map directly to usable
# memory instead. This host reportedly has 4GB total; 2560 leaves
# ~1.5GB for the OS/everything else running alongside the build.
# Override via the NODE_BUILD_MEMORY_MB build arg.
ARG NODE_BUILD_MEMORY_MB=2560
ENV NODE_OPTIONS=--max-old-space-size=${NODE_BUILD_MEMORY_MB}

# Build the project
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Disable telemetry during runtime
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

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

# server.js is created by next build from the standalone output
CMD ["node", "server.js"]
