#!/usr/bin/env bash
set -euo pipefail

urls=(
  "https://reclaimdev.com"
  "https://airanger.dev"
  "https://carlssoncreative.com"
  "https://compossure.com"
)

timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
flagged=()

for u in "${urls[@]}"; do
  # default values
  code="000"
  time_s="0"

  # attempt curl
  if out=$(curl -sL -o /dev/null -w "%{http_code} %{time_total}" --connect-timeout 5 --max-time 15 "$u" 2>/dev/null); then
    code=$(echo "$out" | awk '{print $1}')
    time_s=$(echo "$out" | awk '{print $2}')
  fi

  # convert to ms
  time_ms=$(awk -v t="$time_s" 'BEGIN{printf "%d", (t+0)*1000}')

  status="OK"
  if ! [[ "$code" =~ ^[2][0-9][0-9]$ ]]; then
    status="DOWN"
  fi
  if [ "$time_ms" -gt 2000 ]; then
    # escalate to HIGH_LATENCY unless already DOWN
    if [ "$status" = "OK" ]; then
      status="HIGH_LATENCY"
    fi
  fi

  if [ "$status" != "OK" ]; then
    remediation="Check server status and DNS; consider restarting service or investigating errors."
    flagged+=("$u|$code|$time_ms|$status|$remediation")
  fi
done

if [ ${#flagged[@]} -eq 0 ]; then
  # no output when all healthy
  exit 0
fi

# Build JSON output
json='{"timestamp":"'"$timestamp"'","flags":['
first=true
for e in "${flagged[@]}"; do
  IFS='|' read -r url code latency status remediation <<<"$e"
  if [ "$first" = true ]; then
    first=false
  else
    json+=','
  fi
  # escape quotes in remediation/url just in case
  esc_url=$(printf '%s' "$url" | sed 's/"/\\"/g')
  esc_rem=$(printf '%s' "$remediation" | sed 's/"/\\"/g')
  json+='{"url":"'"$esc_url"'","status":"'"$status"'","http_status":"'"$code"'","latency_ms":'"$latency"',"remediation":"'"$esc_rem"'"}'
done
json+=']}'

echo "$json"
exit 0
