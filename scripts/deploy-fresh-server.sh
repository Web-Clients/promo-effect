#!/bin/bash
# Promo-Effect — automated fresh-server deploy.
# Run from inside a cloned /opt/promo-effect after you've placed the
# handoff files (db-FRESH.dump, uploads/, backend.env) in $HANDOFF.
#
# Usage:
#   HANDOFF=/path/to/handoff DBPASS='your_db_password' bash scripts/deploy-fresh-server.sh
#
# It does NOT create the postgres user/db or nginx/SSL — see DEPLOY.md
# steps 1, 3 and 9 for those (they need sudo and domain-specific input).

set -euo pipefail
HANDOFF="${HANDOFF:?Set HANDOFF=/path/to/handoff}"
DBPASS="${DBPASS:?Set DBPASS=your_db_password}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> [1/6] Frontend deps + build"
npm ci --legacy-peer-deps
npm run build

echo "==> [2/6] Backend deps + build"
cd backend
npm ci
npm run build
npx prisma generate

echo "==> [3/6] .env"
if [ ! -f .env ]; then
  cp "$HANDOFF/backend.env" .env
  echo "    Copied backend.env → backend/.env  (EDIT DATABASE_URL + domain before running live!)"
fi

echo "==> [4/6] DB schema + data"
npx prisma migrate deploy
PGPASSWORD="$DBPASS" pg_restore -h localhost -U promo_effect -d promo_effect \
  --data-only --disable-triggers "$HANDOFF/db-FRESH.dump" || \
  echo "    (pg_restore reported non-fatal notices — check output above)"

echo "==> [5/6] Uploads"
mkdir -p "$ROOT/uploads"
rsync -a "$HANDOFF/uploads/" "$ROOT/uploads/"

echo "==> [6/6] Start with PM2"
pm2 start dist/server.js --name promo-effect-backend --update-env || \
  pm2 restart promo-effect-backend --update-env
pm2 save

sleep 4
echo "==> Health check:"
curl -s http://localhost:3001/health && echo
echo "==> Done. Next: configure nginx + SSL (DEPLOY.md step 9)."
