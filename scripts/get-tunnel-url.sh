#!/usr/bin/env bash
# Print the current cloudflared quick-tunnel URL by querying its
# local metrics endpoint. No log scraping needed.
#
# Usage:
#   ./scripts/get-tunnel-url.sh
#
# Exit codes:
#   0  URL printed to stdout
#   1  no cloudflared process or metrics endpoint not reachable
#
# Notes:
#   - Works only with the "quick tunnel" mode (cloudflared tunnel --url ...).
#   - Metrics port is dynamic; we discover it from the process itself.

set -euo pipefail

PID="$(pgrep -f 'cloudflared tunnel --url' | head -1 || true)"
if [ -z "${PID:-}" ]; then
  echo "✗ no cloudflared tunnel process found" >&2
  exit 1
fi

# Find the metrics port from the process listening sockets
PORT="$(lsof -nP -iTCP -sTCP:LISTEN -p "$PID" 2>/dev/null \
  | awk '/127\.0\.0\.1:[0-9]+/ {sub(/.*:/, "", $9); print $9}' | head -1)"

# Fallback: probe well-known cloudflared metrics ports
if [ -z "${PORT:-}" ]; then
  for try in 20242 20243 20244 20245 20246; do
    if curl -fs "http://127.0.0.1:${try}/quicktunnel" >/dev/null 2>&1; then
      PORT="$try"
      break
    fi
  done
fi

if [ -z "${PORT:-}" ]; then
  echo "✗ could not locate cloudflared metrics port" >&2
  exit 1
fi

HOST="$(curl -fs "http://127.0.0.1:${PORT}/quicktunnel" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("hostname",""))')"

if [ -z "$HOST" ]; then
  echo "✗ metrics endpoint returned no hostname" >&2
  exit 1
fi

echo "https://${HOST}"
