#!/usr/bin/env bash
# The OS layer here (CallKit/Telecom adapter, call bridge, background-timers
# module, wake config plugins) is a copy of the os-integration example's, kept
# so this app runs on its own. Run this to refresh the copy from it, or with
# --check to list the files that differ.
#
# The callkit patch and the wake harness are deliberate forks and are not
# listed.
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
src="$here/../../sdk/examples/mobile/os-integration"

shared=(
  src/callBridge.ts
  src/CallProximity.tsx
  src/permissions.ts
  src/webrtcGlobals.ts
  src/os/expoCallKitTelecomAdapter.ts
  modules/background-timers/index.ts
  modules/background-timers/expo-module.config.json
  modules/background-timers/android/build.gradle
  modules/background-timers/android/src/main/java/expo/modules/backgroundtimers/BackgroundTimersModule.kt
  modules/background-timers/ios/BackgroundTimers.podspec
  modules/background-timers/ios/BackgroundTimersModule.swift
  plugins/withCallKitIcon.js
  plugins/withLocalRigCleartext.js
  plugins/withWakeHeadlessService.js
)

if [[ "${1:-}" == "--check" ]]; then
  drift=0
  for path in "${shared[@]}"; do
    if ! cmp -s "$src/$path" "$here/$path"; then
      echo "drifted from os-integration: $path" >&2
      drift=1
    fi
  done
  if ((drift)); then
    echo "Run scripts/sync-os-integration.sh and commit the result." >&2
  fi
  exit "$drift"
fi

for path in "${shared[@]}"; do
  mkdir -p "$here/$(dirname "$path")"
  cp "$src/$path" "$here/$path"
done
