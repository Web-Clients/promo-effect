#!/bin/bash
# Setup HTTPS with Let's Encrypt for Promo-Effect
# Run on server 141.227.180.43 as root/sudo
# Domain: promo-efect.md (adjust if different)

set -euo pipefail

DOMAIN="${1:-promo-efect.md}"
EMAIL="${2:-office@megapromoting.com}"

echo "=== Setting up HTTPS for $DOMAIN ==="

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get update
    apt-get install -y certbot
fi

# Install nginx if not present (reverse proxy)
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    apt-get install -y nginx
fi

# Stop nginx temporarily for standalone cert
systemctl stop nginx 2>/dev/null || true

# Get certificate
certbot certonly --standalone \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive

# Create nginx config
cat > /etc/nginx/sites-available/promo-effect <<NGINX
# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

# HTTPS - Frontend
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    # Frontend static files
    root /opt/promo-effect/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/promo-effect /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and start
nginx -t
systemctl start nginx
systemctl enable nginx

# Auto-renewal cron
echo "0 3 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renew

echo "=== HTTPS setup complete ==="
echo "Frontend: https://$DOMAIN"
echo "API: https://$DOMAIN/api/"
echo "Certificate auto-renews via cron"
