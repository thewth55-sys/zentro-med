#!/bin/sh
set -e

# Wraps the real start command (`node server.js`) with Infisical when
# it's configured, so runtime secrets (SUPABASE_SERVICE_ROLE_KEY,
# ENCRYPTION_KEY, STRIPE_SECRET_KEY, ...) live only in Infisical's
# vault and this container's memory — never as plaintext env vars
# sitting in Easypanel's own config.
#
# Deliberately falls back to the OLD behavior (secrets still coming
# straight from whatever env vars Easypanel injects) when Infisical
# isn't configured yet — this makes rolling this out a genuine no-op
# until the three INFISICAL_* vars below are actually set in Easypanel,
# instead of an all-or-nothing cutover that could take the app down if
# something about the migration is wrong.
if [ -n "$INFISICAL_UNIVERSAL_AUTH_CLIENT_ID" ] && [ -n "$INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET" ] && [ -n "$INFISICAL_PROJECT_ID" ]; then
  echo "[entrypoint] Infisical configured — fetching runtime secrets..."
  INFISICAL_TOKEN="$(infisical login \
    --method=universal-auth \
    --client-id="$INFISICAL_UNIVERSAL_AUTH_CLIENT_ID" \
    --client-secret="$INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET" \
    --plain --silent)"
  export INFISICAL_TOKEN
  exec infisical run \
    --projectId="$INFISICAL_PROJECT_ID" \
    --env="${INFISICAL_ENV:-prod}" \
    -- node server.js
else
  echo "[entrypoint] Infisical not configured (INFISICAL_UNIVERSAL_AUTH_CLIENT_ID/CLIENT_SECRET/PROJECT_ID unset) — starting with plain env vars, same as before."
  exec node server.js
fi
