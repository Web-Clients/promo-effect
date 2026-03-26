#!/bin/bash
# PostgreSQL backup script for Promo-Effect
# Run on server or via cron: 0 2 * * * /opt/promo-effect/scripts/backup-db.sh
# Keeps last 7 daily + 4 weekly backups

set -euo pipefail

BACKUP_DIR="/opt/promo-effect/backups"
DB_NAME="promo_effect"
DB_USER="promo_effect"
DATE=$(date +%Y-%m-%d_%H%M)
DAY_OF_WEEK=$(date +%u)

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

echo "[$(date)] Starting backup..."

# Daily backup
pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$BACKUP_DIR/daily/${DB_NAME}_${DATE}.dump"

# Weekly backup (Sunday)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    cp "$BACKUP_DIR/daily/${DB_NAME}_${DATE}.dump" "$BACKUP_DIR/weekly/"
fi

# Cleanup: keep 7 daily
find "$BACKUP_DIR/daily" -name "*.dump" -mtime +7 -delete

# Cleanup: keep 4 weekly
find "$BACKUP_DIR/weekly" -name "*.dump" -mtime +28 -delete

# Verify backup
BACKUP_SIZE=$(stat -c%s "$BACKUP_DIR/daily/${DB_NAME}_${DATE}.dump" 2>/dev/null || stat -f%z "$BACKUP_DIR/daily/${DB_NAME}_${DATE}.dump")

if [ "$BACKUP_SIZE" -gt 0 ]; then
    echo "[$(date)] Backup OK: ${DB_NAME}_${DATE}.dump ($BACKUP_SIZE bytes)"
else
    echo "[$(date)] ERROR: Backup file is empty!" >&2
    exit 1
fi
