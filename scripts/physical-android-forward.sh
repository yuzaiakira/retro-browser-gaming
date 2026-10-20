#!/usr/bin/env bash
# Forward Compose web/API to an attached Android device without weakening COOP/COEP.
set -euo pipefail
if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found. Install Android platform-tools, then re-run." >&2
  exit 1
fi
adb start-server
mapfile -t devices < <(adb devices | awk 'NR>1 && $2=="device" {print $1}')
if [[ ${#devices[@]} -eq 0 ]]; then
  echo "No authorized Android devices (adb devices)." >&2
  exit 1
fi
echo "Using device: ${devices[0]}"
adb -s "${devices[0]}" reverse tcp:13000 tcp:13000
adb -s "${devices[0]}" reverse tcp:18000 tcp:18000
echo "On the device, open Chrome to http://127.0.0.1:13000/"
echo "Open /diagnostics and confirm: secure, opfs, locks, threads as required."
echo "Do not disable COOP/COEP or ignore TLS errors to force a pass."
