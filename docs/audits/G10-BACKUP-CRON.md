# G10 — Backup Automation

**Date:** 2026-04-30
**Status:** `scripts/backup-db.sh` exists with daily + weekly rotation

---

## Existing Script

`scripts/backup-db.sh` implements:

- Daily pg_dump with timestamp to `/opt/promo-effect/backups/daily/`
- Weekly backup on Sunday (copy daily → weekly)
- Keeps 7 daily backups (deletes > 7 days)
- Keeps 4 weekly backups (deletes > 28 days)
- Validates backup size > 0 bytes

---

## Cron Configuration on Server

Edit cron with `crontab -e` as the `ubuntu` user:

```cron
# Promo-Effect Database Backups

# Daily at 02:00 — keep 7 days
0 2 * * * /opt/promo-effect/scripts/backup-db.sh >> /var/log/promo-effect-backup.log 2>&1

# Monthly on 1st at 03:00 — full backup + verify restore
0 3 1 * * /opt/promo-effect/scripts/backup-monthly.sh >> /var/log/promo-effect-backup-monthly.log 2>&1

# Weekly cleanup report (Sunday 08:00)
0 8 * * 0 ls -lh /opt/promo-effect/backups/daily/ >> /var/log/promo-effect-backup.log 2>&1
```

---

## Backup Retention Policy

| Frequency       | Storage                                             | Retention         |
| --------------- | --------------------------------------------------- | ----------------- |
| Daily (02:00)   | `/opt/promo-effect/backups/daily/`                  | 7 days            |
| Weekly (Sunday) | `/opt/promo-effect/backups/weekly/`                 | 4 weeks (28 days) |
| Monthly (1st)   | `/opt/promo-effect/backups/monthly/` + S3/Backblaze | 6 months          |

---

## Monthly Backup Script Template

Create `scripts/backup-monthly.sh`:

```bash
#!/bin/bash
# Monthly full backup + offsite upload + restore verification
set -euo pipefail

BACKUP_DIR="/opt/promo-effect/backups"
DB_NAME="promo_effect"
DB_USER="promo_effect"
DATE=$(date +%Y-%m)
MONTHLY_FILE="$BACKUP_DIR/monthly/${DB_NAME}_${DATE}.dump"

mkdir -p "$BACKUP_DIR/monthly"

echo "[$(date)] Monthly backup start..."

# Full dump
pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$MONTHLY_FILE"

BACKUP_SIZE=$(stat -c%s "$MONTHLY_FILE" 2>/dev/null || stat -f%z "$MONTHLY_FILE")
echo "[$(date)] Backup size: $BACKUP_SIZE bytes"

# Verify restore (to temp DB)
TEMP_DB="${DB_NAME}_verify_${DATE//[-]/_}"
createdb -U "$DB_USER" "$TEMP_DB" || true
pg_restore -U "$DB_USER" -d "$TEMP_DB" --schema-only "$MONTHLY_FILE"
echo "[$(date)] Schema restore verify: OK"
dropdb -U "$DB_USER" "$TEMP_DB"

# Upload to Backblaze B2 (if configured)
if command -v b2 &> /dev/null && [ -n "${B2_BUCKET:-}" ]; then
  b2 upload-file "$B2_BUCKET" "$MONTHLY_FILE" "backups/${DB_NAME}_${DATE}.dump"
  echo "[$(date)] Uploaded to B2: $B2_BUCKET"
fi

# Upload to S3 (if configured)
if command -v aws &> /dev/null && [ -n "${S3_BUCKET:-}" ]; then
  aws s3 cp "$MONTHLY_FILE" "s3://${S3_BUCKET}/monthly/${DB_NAME}_${DATE}.dump"
  echo "[$(date)] Uploaded to S3: $S3_BUCKET"
fi

# Cleanup: keep 6 monthly backups
find "$BACKUP_DIR/monthly" -name "*.dump" -mtime +180 -delete

echo "[$(date)] Monthly backup complete: $MONTHLY_FILE"
```

Make executable: `chmod +x scripts/backup-monthly.sh`

---

## Offsite Storage Configuration

### Option A — Backblaze B2 (cheapest, $0.006/GB/month)

```bash
# Install Backblaze B2 CLI
pip install b2

# Authorize
b2 authorize-account $B2_APP_KEY_ID $B2_APP_KEY

# Create bucket
b2 create-bucket promo-effect-backups allPrivate

# Add to server .env:
B2_BUCKET=promo-effect-backups
B2_APP_KEY_ID=xxxx
B2_APP_KEY=xxxx
```

### Option B — AWS S3 (standard)

```bash
# Install AWS CLI
apt-get install awscli

# Configure
aws configure  # or use IAM role on EC2

# Create bucket
aws s3 mb s3://promo-effect-backups --region eu-central-1

# Add lifecycle policy: delete objects > 180 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket promo-effect-backups \
  --lifecycle-configuration file://s3-lifecycle.json

# Add to server .env:
S3_BUCKET=promo-effect-backups
AWS_ACCESS_KEY_ID=xxxx
AWS_SECRET_ACCESS_KEY=xxxx
```

---

## Backup Monitoring

Add to `health-monitor.sh` or separate check:

```bash
#!/bin/bash
# Verify last backup is not older than 25 hours
LAST_BACKUP=$(find /opt/promo-effect/backups/daily -name "*.dump" -mtime -1 | head -1)
if [ -z "$LAST_BACKUP" ]; then
  # Alert via Telegram
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=⚠️ Promo-Effect: No backup found in last 25h!"
fi
```

---

## Restore Procedure

```bash
# Restore from daily backup:
pg_restore -U promo_effect -d promo_effect --clean \
  /opt/promo-effect/backups/daily/promo_effect_YYYY-MM-DD_HHMM.dump

# Restore from monthly (verify step with schema only first):
pg_restore -U promo_effect -d promo_effect_test --schema-only monthly.dump
pg_restore -U promo_effect -d promo_effect --clean monthly.dump
```

> Always run a schema-only test restore before restoring to production.
