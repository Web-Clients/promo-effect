# G8 — Monitoring & Uptime Checks

**Date:** 2026-04-30
**Status:** `scripts/health-monitor.sh` exists; formal monitoring not yet configured

---

## Existing: health-monitor.sh

`scripts/health-monitor.sh` already implements basic health checks.
It should be run via cron on the server to detect downtime.

---

## UptimeRobot Configuration

UptimeRobot free tier: 50 monitors, 5-minute check interval.

### Monitors to configure

| Monitor Name            | URL                                            | Type                         | Alert threshold        |
| ----------------------- | ---------------------------------------------- | ---------------------------- | ---------------------- |
| Promo-Effect Frontend   | `https://promo-effect.com/`                    | HTTPS                        | 2 consecutive failures |
| Promo-Effect API Health | `https://promo-effect.com/api/health`          | HTTPS                        | 1 failure              |
| Promo-Effect CSRF       | `https://promo-effect.com/api/auth/csrf-token` | HTTPS                        | 1 failure              |
| Promo-Effect Login      | `https://promo-effect.com/login`               | Keyword (check for "Log In") | 2 failures             |

### Alert contacts

1. Email: admin email
2. Telegram bot (see below)

---

## Telegram Alert Bot

Create a Telegram bot and configure UptimeRobot to send alerts via webhook.

### Setup

1. Create bot via @BotFather → get token
2. Get your chat ID (send message to bot, call `getUpdates`)
3. In UptimeRobot → Alert Contacts → Add Telegram
4. Or use custom webhook → call Telegram Bot API

### Custom alert script (for health-monitor.sh integration)

```bash
#!/bin/bash
TELEGRAM_BOT_TOKEN="your_bot_token"
TELEGRAM_CHAT_ID="your_chat_id"

send_telegram_alert() {
  local message="$1"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=${message}" \
    -d "parse_mode=HTML"
}

# Usage in health check:
if ! curl -sf https://promo-effect.com/api/health > /dev/null; then
  send_telegram_alert "🔴 <b>Promo-Effect API DOWN</b>\n$(date)"
fi
```

Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to server `.env`.

---

## Health Endpoint Verification

Ensure `GET /api/health` returns:

```json
{
  "status": "ok",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "uptime": 12345,
  "db": "connected"
}
```

The endpoint should:

- Check database connectivity (Prisma ping)
- Return `200 OK` when healthy
- Return `503 Service Unavailable` when DB is down

---

## Status Page (statuspage.io)

Free tier: 3 monitors, public status page.

1. Sign up at statuspage.io
2. Create components:
   - Web App
   - API
   - Database
3. Integrate with UptimeRobot via API to auto-update status
4. Share URL with clients: `https://status.promo-effect.com` (CNAME to statuspage.io)

Alternative free option: **Upptime** (GitHub-hosted status page):

```yaml
# .github/upptime/upptime.yml
sites:
  - name: Promo-Effect
    url: https://promo-effect.com/api/health
  - name: API
    url: https://promo-effect.com/api/auth/csrf-token
```

---

## Cron on Server

```cron
# /etc/cron.d/promo-effect-monitoring
# Check every 5 minutes
*/5 * * * * ubuntu /opt/promo-effect/scripts/health-monitor.sh >> /var/log/promo-effect-health.log 2>&1
```

---

## Alert Severity Levels

| Level     | Condition            | Action                 |
| --------- | -------------------- | ---------------------- |
| INFO      | Response time > 1s   | Log only               |
| WARNING   | Response time > 3s   | Telegram alert         |
| CRITICAL  | Endpoint down 1x     | Telegram + Email       |
| EMERGENCY | Endpoint down 5+ min | Telegram + Email + SMS |

---

## Dashboard (Optional)

For internal monitoring: **Grafana + Prometheus** or **Grafana Cloud free tier**.

- Node.js metrics: `prom-client` npm package
- Expose `/metrics` endpoint (restricted to internal access only)
- Dashboard: request rate, error rate, response time, DB pool usage
