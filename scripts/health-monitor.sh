#!/bin/bash
# Simple uptime monitor for Promo-Effect
# Add to cron: */5 * * * * /opt/promo-effect/scripts/health-monitor.sh
# Restarts backend if health check fails, sends notification

set -euo pipefail

SERVER="127.0.0.1"
PORT="3001"
LOG_FILE="/var/log/promo-effect-monitor.log"
MAX_RESTARTS=3
RESTART_COUNT_FILE="/tmp/promo-effect-restart-count"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://$SERVER:$PORT/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    # Reset restart counter on success
    echo "0" > "$RESTART_COUNT_FILE"
    exit 0
fi

# Failed — log it
log "ALERT: Health check failed (HTTP $HTTP_CODE)"

# Check restart count
RESTARTS=$(cat "$RESTART_COUNT_FILE" 2>/dev/null || echo "0")

if [ "$RESTARTS" -ge "$MAX_RESTARTS" ]; then
    log "CRITICAL: Max restarts ($MAX_RESTARTS) reached. Manual intervention needed."
    exit 1
fi

# Attempt restart
log "Restarting backend (attempt $((RESTARTS + 1))/$MAX_RESTARTS)..."
sudo systemctl restart promo-effect-backend

echo "$((RESTARTS + 1))" > "$RESTART_COUNT_FILE"

# Wait and re-check
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://$SERVER:$PORT/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log "Recovery OK after restart"
else
    log "Still unhealthy after restart (HTTP $HTTP_CODE)"
fi
