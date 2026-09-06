#!/bin/bash
# Promo-Effect deployment.
#
# Usage: ./scripts/deploy.sh [--skip-backup] [--migrate] [--force]
#
# Three things in this script were stale until 6 Sep 2026 and would have made it
# fail outright: it pointed at 141.227.180.43 (the instance deleted on 30 Apr),
# it restarted a systemd unit that does not exist (the API runs under pm2), and
# it health-checked port 3001 directly, which nginx does not expose.

set -euo pipefail

SSH_HOST="${DEPLOY_SSH_HOST:-ubuntu@141.227.180.107}"
PUBLIC_URL="${DEPLOY_PUBLIC_URL:-https://141-227-180-107.sslip.io}"
REMOTE_PATH="/opt/promo-effect"
PM2_APP="promo-effect-backend"
SKIP_BACKUP=false
RUN_MIGRATE=false
FORCE=false

for arg in "$@"; do
    case $arg in
        --skip-backup) SKIP_BACKUP=true ;;
        --migrate) RUN_MIGRATE=true ;;
        --force) FORCE=true ;;
    esac
done

remote() { ssh "$SSH_HOST" "$@"; }

echo "=== Promo-Effect deploy ==="
echo "Host: $SSH_HOST | Path: $REMOTE_PATH"
echo "Backup: $([ "$SKIP_BACKUP" = true ] && echo SKIP || echo YES) | Migrate: $([ "$RUN_MIGRATE" = true ] && echo YES || echo NO)"
echo ""

# 0. Do not restart the API out from under someone who is filling in an order.
#    A booking half-submitted across a restart is silently lost.
echo "[0/7] Checking for live sessions..."
ACTIVE=$(remote "DB=\$(grep -m1 '^DATABASE_URL=' $REMOTE_PATH/backend/.env | cut -d= -f2- | tr -d '\"'); psql \$DB -tAc \"select count(*) from sessions where created_at > now() - interval '15 minutes'\"" | tr -d '[:space:]')
if [ "${ACTIVE:-0}" != "0" ]; then
    if [ "$FORCE" = true ]; then
        echo "  $ACTIVE session(s) in the last 15 min — continuing (--force)"
    else
        echo "  REFUSING: $ACTIVE session(s) started in the last 15 minutes."
        echo "  Someone may be mid-order. Wait, or re-run with --force."
        exit 1
    fi
else
    echo "  No sessions in the last 15 minutes."
fi

if [ "$SKIP_BACKUP" = false ]; then
    echo "[1/7] Backing up database..."
    remote "mkdir -p /opt/backups && DB=\$(grep -m1 '^DATABASE_URL=' $REMOTE_PATH/backend/.env | cut -d= -f2- | tr -d '\"'); pg_dump -Fc \"\$DB\" > /opt/backups/promo_effect_\$(date +%Y%m%d_%H%M%S).dump && find /opt/backups -name '*.dump' -mtime +7 -delete"
    echo "  Backup OK, dumps older than 7 days removed."
else
    echo "[1/7] Skipping backup (--skip-backup)"
fi

echo "[2/7] Pulling code..."
remote "cd $REMOTE_PATH && git pull --ff-only origin main"

echo "[3/7] Installing dependencies..."
remote "cd $REMOTE_PATH && npm ci --legacy-peer-deps && cd backend && npm ci"

echo "[4/7] Building frontend + backend..."
remote "cd $REMOTE_PATH && npm run build && cd backend && npm run build"

echo "[5/7] Prisma generate..."
remote "cd $REMOTE_PATH/backend && npx prisma generate"
if [ "$RUN_MIGRATE" = true ]; then
    echo "  Applying migrations..."
    remote "cd $REMOTE_PATH/backend && npx prisma migrate deploy"
fi

echo "[6/7] Restarting the API (pm2) and reloading nginx..."
remote "cd $REMOTE_PATH/backend && pm2 restart $PM2_APP --update-env && sudo nginx -t && sudo systemctl reload nginx"

echo "[7/7] Health check..."
sleep 5
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$PUBLIC_URL/health" || echo 000)
if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "=== DEPLOY OK ==="
    echo "Health 200 · $PUBLIC_URL"
else
    echo ""
    echo "=== DEPLOY WARNING: health returned $HTTP_CODE ==="
    echo "Debug: ssh $SSH_HOST 'pm2 logs $PM2_APP --lines 50 --nostream'"
    exit 1
fi
