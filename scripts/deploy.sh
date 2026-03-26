#!/bin/bash
# Promo-Effect Deployment Script
# Server: 141.227.180.43
# User: ubuntu

set -e

echo "=== Promo-Effect Deployment ==="

# 1. Backup database
echo "Backing up database..."
ssh ubuntu@141.227.180.43 "pg_dump -Fc promo_effect > /opt/backups/promo_effect_$(date +%Y%m%d_%H%M%S).dump"

# 2. Pull latest code
echo "Pulling latest code..."
ssh ubuntu@141.227.180.43 "cd /opt/promo-effect && git pull origin main"

# 3. Install dependencies
echo "Installing dependencies..."
ssh ubuntu@141.227.180.43 "cd /opt/promo-effect && npm ci --legacy-peer-deps && cd backend && npm ci"

# 4. Build
echo "Building..."
ssh ubuntu@141.227.180.43 "cd /opt/promo-effect && npm run build && cd backend && npm run build"

# 5. Run migrations (if any)
# ssh ubuntu@141.227.180.43 "cd /opt/promo-effect/backend && npx prisma migrate deploy"

# 6. Restart services
echo "Restarting services..."
ssh ubuntu@141.227.180.43 "sudo systemctl restart promo-effect-backend"

echo "=== Deployment complete ==="
