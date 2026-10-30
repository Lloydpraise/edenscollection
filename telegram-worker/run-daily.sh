#!/usr/bin/env bash
# Daily entry point for cron on the Heysasa server: pulls the latest worker code and runs one sync.
# Output goes to telegram-worker/logs/sync.log.
set -euo pipefail
cd "$(dirname "$0")"

# cron starts with a bare PATH; pick up Node if it was installed with nvm.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null

mkdir -p logs
exec >>logs/sync.log 2>&1
echo "=== $(date -Is) ==="

# Only one run at a time.
exec 9>logs/.lock
flock -n 9 || { echo "Previous run still going, skipping."; exit 0; }

git -C .. pull --ff-only -q || echo "(couldn't update the code, running the current version)"
npm ci --omit=dev --silent
node --env-file=.env sync.js --runner=server --trigger=cron
