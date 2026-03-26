#!/bin/bash
# Daily PostgreSQL backup for Promo-Effect
# Add to crontab: 0 3 * * * /opt/promo-effect/scripts/backup.sh

BACKUP_DIR="/opt/backups"
DB_NAME="promo_effect"
RETAIN_DAYS=30

mkdir -p $BACKUP_DIR
FILENAME="${BACKUP_DIR}/${DB_NAME}_$(date +%Y%m%d_%H%M%S).dump"

pg_dump -Fc $DB_NAME > $FILENAME
echo "Backup created: $FILENAME"

# Remove old backups
find $BACKUP_DIR -name "${DB_NAME}_*.dump" -mtime +$RETAIN_DAYS -delete
echo "Old backups cleaned (>${RETAIN_DAYS} days)"
