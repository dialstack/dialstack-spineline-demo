#!/usr/bin/env bash
# Starts the wake webhook harness. Session tokens come from Spineline, so the
# harness holds no DialStack key — only push credentials and the Spineline URL.
#
# Reads everything from the environment — copy .env.example to .env.local, fill it
# in, and `set -a; . ./.env.local; set +a` before running this. Nothing is defaulted
# to a real account or key: an unset value aborts here rather than sending a call
# somewhere unexpected.
set -euo pipefail

: "${SPINELINE_URL:?set SPINELINE_URL (the Spineline backend the app signs in to)}"
: "${FCM_PROJECT_ID:?set FCM_PROJECT_ID (the Firebase project that owns google-services.json)}"

# Optional: the endpoint's signing secret (only the /v1/webhook_endpoints create
# response returns it). Set it to have the harness verify webhooks; unset, it
# accepts them unsigned and warns — fine for a local harness behind a rotating
# tunnel, not for a deployed integrator server.
export DIALSTACK_WEBHOOK_SECRET="${DIALSTACK_WEBHOOK_SECRET:-}"

# Optional: APNs, needed only once an iOS device registers. Exported empty rather
# than left unset so `set -u` doesn't abort the harness for Android-only users —
# the server reports which of these is missing if an iOS push is actually tried.
export APNS_KEY_PATH="${APNS_KEY_PATH:-}"
export APNS_KEY_ID="${APNS_KEY_ID:-}"
export APNS_TEAM_ID="${APNS_TEAM_ID:-}"
export APNS_BUNDLE_ID="${APNS_BUNDLE_ID:-ai.dialstack.spineline.demo}"
export APNS_HOST="${APNS_HOST:-api.sandbox.push.apple.com}"

echo "spineline: $SPINELINE_URL"
echo "fcm project: $FCM_PROJECT_ID"
if [ -n "$DIALSTACK_WEBHOOK_SECRET" ]; then
  echo "webhook verification: on"
else
  echo "webhook verification: off (unsigned, local harness)"
fi
if [ -n "$APNS_KEY_ID" ]; then
  echo "apns: $APNS_KEY_ID -> $APNS_HOST"
else
  echo "apns: unconfigured (Android only)"
fi

pkill -f wake-webhook-server >/dev/null 2>&1 || true
sleep 1
node scripts/wake-webhook-server.mjs
