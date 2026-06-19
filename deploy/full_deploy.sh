#!/bin/bash
# Full deployment script for debtinex.uz
# Safe to run alongside other bots — only touches /var/www/debttracker and its own nginx/systemd entries
set -e

DOMAIN="debtinex.uz"
SRC_DIR="/opt/devTrackerBot"
APP_DIR="/var/www/debttracker"
BOT_TOKEN="8807182820:AAECiQ0JIzfyZrh9WDv2UGYV7oqJ6rXREOs"

echo ""
echo "==> [1/9] Checking existing server state (will not modify other projects)"
echo "--- Running nginx sites ---"
ls /etc/nginx/sites-enabled/ 2>/dev/null || echo "(none)"
echo "--- Running bot services ---"
systemctl list-units --type=service --state=running 2>/dev/null | grep -v systemd | grep -v dbus | grep -v ssh | grep -v cron || echo "(none listed)"
echo ""

echo "==> [2/9] Installing required system packages"
apt-get update -qq
apt-get install -y python3.12 python3.12-venv python3-pip nginx postgresql postgresql-contrib certbot python3-certbot-nginx nodejs npm git

echo "==> [3/9] Setting up PostgreSQL"
sudo -u postgres psql -c "CREATE USER debttracker WITH PASSWORD 'dtpassword2024';" 2>/dev/null || echo "(user already exists, skipping)"
sudo -u postgres psql -c "CREATE DATABASE debttracker OWNER debttracker;" 2>/dev/null || echo "(database already exists, skipping)"

echo "==> [4/9] Copying project to $APP_DIR"
mkdir -p $APP_DIR
cp -r $SRC_DIR/. $APP_DIR/
chown -R www-data:www-data $APP_DIR

echo "==> [5/9] Setting up Python virtual environment and installing dependencies"
python3.12 -m venv $APP_DIR/venv
$APP_DIR/venv/bin/pip install -q -r $APP_DIR/backend/requirements.txt

echo "==> [6/9] Building React frontend"
cd $APP_DIR/frontend
npm install --silent
npm run build
mkdir -p /var/www/debttracker/frontend_dist
cp -r dist/* /var/www/debttracker/frontend_dist/

echo "==> [7/9] Running database migrations"
cd $APP_DIR/backend
MINI_APP_URL=https://$DOMAIN $APP_DIR/venv/bin/alembic upgrade head

echo "==> [8/9] Writing .env"
cat > $APP_DIR/.env <<EOF
BOT_TOKEN=8807182820:AAECiQ0JIzfyZrh9WDv2UGYV7oqJ6rXREOs
ADMIN_TELEGRAM_ID=49036206
DATABASE_URL=postgresql+asyncpg://debttracker:dtpassword2024@localhost:5432/debttracker
SECRET_KEY=1C4ADBEA56E59FCD97E24F1141F4A331FCE2BF115FE678618A2A870974304EE6
MINI_APP_URL=https://$DOMAIN
PAYMENT_LINK=https://$DOMAIN/pay
PAYMENT_QR_PATH=
TRIAL_DAYS=7
ENVIRONMENT=production
EOF

echo "==> [9/9] Installing systemd services"
cp $APP_DIR/deploy/backend.service /etc/systemd/system/debttracker-backend.service
cp $APP_DIR/deploy/bot.service /etc/systemd/system/debttracker-bot.service
systemctl daemon-reload
systemctl enable debttracker-backend debttracker-bot
systemctl restart debttracker-backend debttracker-bot

echo "==> Configuring nginx (adding new site, NOT touching existing ones)"
# Only remove the default nginx placeholder — not any real bot sites
if [ -L /etc/nginx/sites-enabled/default ]; then
    # Check if default actually serves anything real
    if grep -q "server_name _" /etc/nginx/sites-available/default 2>/dev/null; then
        rm -f /etc/nginx/sites-enabled/default
        echo "(removed nginx default placeholder)"
    fi
fi
sed "s/YOUR_DOMAIN_HERE/$DOMAIN/g" $APP_DIR/deploy/nginx.conf > /etc/nginx/sites-available/debttracker
ln -sf /etc/nginx/sites-available/debttracker /etc/nginx/sites-enabled/debttracker
nginx -t && systemctl reload nginx

echo "==> Obtaining SSL certificate for $DOMAIN"
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

echo "==> Setting Telegram webhook + Mini App button"
curl -s "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -d "url=https://$DOMAIN/webhook" \
  -d "allowed_updates=[\"message\",\"callback_query\"]" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Webhook:', d.get('ok'), d.get('description',''))"

curl -s "https://api.telegram.org/bot$BOT_TOKEN/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d "{\"menu_button\":{\"type\":\"web_app\",\"text\":\"Open App\",\"web_app\":{\"url\":\"https://$DOMAIN\"}}}" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Mini App button:', d.get('ok'))"

echo ""
echo "✅ Deployment complete!"
echo "   Frontend : https://$DOMAIN"
echo "   API      : https://$DOMAIN/api"
echo "   Health   : https://$DOMAIN/health"
echo ""
echo "==> Service status:"
systemctl status debttracker-backend --no-pager -l | tail -5
systemctl status debttracker-bot --no-pager -l | tail -5
