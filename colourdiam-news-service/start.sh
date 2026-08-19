#!/usr/bin/env bash
set -euo pipefail

# Load environment variables from .env if present (parsed literally so cron
# expressions like "0 */4 * * *" are not glob-expanded)
if [ -f .env ]; then
  while IFS='=' read -r key value; do
    case "$key" in
      ''|\#*) continue ;;
      *) export "$key=$value" ;;
    esac
  done < .env
fi

export PORT="${PORT:-3001}"

echo "[start.sh] Starting ColourDiam News Service on port $PORT"
exec npm start
