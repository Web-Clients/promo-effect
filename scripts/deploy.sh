#!/bin/bash
# Promo-Effect Deployment Script
# Server: 141.227.180.43
# User: ubuntu
# Usage: ./scripts/deploy.sh [--skip-backup] [--migrate]

set -euo pipefail

SERVER="141.227.180.43"
SSH_USER="ubuntu"
REMOTE_PATH="/opt/promo-effect"
SKIP_BACKUP=false
RUN_MIGRATE=false

for arg in "$@"; do
    case $arg in
        --skip-backup) SKIP_BACKUP=true ;;
        --migrate) RUN_MIGRATE=true ;;
    esac
done

echo "=== Promo-Effect Deployment ==="
echo "Server: $SERVER | Path: $REMOTE_PATH"
echo "Backup: $([ "$SKIP_BACKUP" = true ] && echo 'SKIP' || echo 'YES')"
echo "Migrate: $([ "$RUN_MIGRATE" = true ] && echo 'YES' || echo 'NO')"
echo ""

# 1. Backup database
if [ "$SKIP_BACKUP" = false ]; then
    echo "[1/7] Backing up database..."
    ssh "$SSH_USER@$SERVER" "mkdir -p /opt/backups && pg_dump -U promo_effect -Fc promo_effect > /opt/backups/promo_effect_\$(date +%Y%m%d_%H%M%S).dump && find /opt/backups -name '*.dump' -mtime +7 -delete"
    echo "  Backup OK, old backups cleaned (>7 days)"
else
    echo "[1/7] Skipping backup (--skip-backup)"
fi

# 2. Pull latest code
echo "[2/7] Pulling latest code..."
ssh "$SSH_USER@$SERVER" "cd $REMOTE_PATH && git pull origin main"

# 3. Install dependencies
echo "[3/7] Installing dependencies..."
ssh "$SSH_USER@$SERVER" "cd $REMOTE_PATH && npm ci --legacy-peer-deps && cd backend && npm ci"

# 4. Build
echo "[4/7] Building frontend + backend..."
ssh "$SSH_USER@$SERVER" "cd $REMOTE_PATH && npm run build && cd backend && npm run build"

# 5. Prisma generate (always) + migrate (optional)
echo "[5/7] Prisma generate..."
ssh "$SSH_USER@$SERVER" "cd $REMOTE_PATH/backend && npx prisma generate"

if [ "$RUN_MIGRATE" = true ]; then
    echo "  Running Prisma migrations..."
    ssh "$SSH_USER@$SERVER" "cd $REMOTE_PATH/backend && npx prisma migrate deploy"
fi

# 6. Restart services
echo "[6/7] Restarting services..."
ssh "$SSH_USER@$SERVER" "sudo systemctl restart promo-effect-backend && sudo nginx -t && sudo systemctl reload nginx"

# 7. Health check
echo "[7/7] Health check..."
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$SERVER:3001/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "=== DEPLOY SUCCESS ==="
    echo "Health: OK (200)"
    echo "Site: http://$SERVER"
else
    echo ""
    echo "=== DEPLOY WARNING ==="
    echo "Health check: $HTTP_CODE"
    echo "Debug: ssh $SSH_USER@$SERVER 'journalctl -u promo-effect-backend --lines 50'"
fi
