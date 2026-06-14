#!/bin/bash
# Full deployment script for Ubuntu 22.04 VPS
# Run as root: bash deploy.sh YOUR_DOMAIN
set -e

DOMAIN=${1:?Usage: bash deploy.sh YOUR_DOMAIN}
APP_DIR=/var/www/debttracker

echo "==> Installing system packages"
apt-get update -qq
apt-get install -y python3.12 python3.12-venv python3-pip nginx postgresql postgresql-contrib certbot python3-certbot-nginx nodejs npm git

echo "==> Setting up PostgreSQL"
sudo -u postgres psql -c "CREATE USER debttracker WITH PASSWORD 'dtpassword2024';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE debttracker OWNER debttracker;" 2>/dev/null || true

echo "==> Creating app directory"
mkdir -p $APP_DIR
cp -r . $APP_DIR
chown -R www-data:www-data $APP_DIR

echo "==> Setting up Python virtual environment"
python3.12 -m venv $APP_DIR/venv
$APP_DIR/venv/bin/pip install -r $APP_DIR/backend/requirements.txt

echo "==> Building React frontend"
cd $APP_DIR/frontend
npm install
npm run build
mkdir -p /var/www/debttracker/frontend_dist
cp -r dist/* /var/www/debttracker/frontend_dist/

echo "==> Running database migrations"
cd $APP_DIR/backend
$APP_DIR/venv/bin/alembic upgrade head

echo "==> Updating .env with domain"
sed -i "s|MINI_APP_URL=.*|MINI_APP_URL=https://$DOMAIN|g" $APP_DIR/.env
sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql+asyncpg://debttracker:dtpassword2024@localhost:5432/debttracker|g" $APP_DIR/.env

echo "==> Installing systemd services"
cp $APP_DIR/deploy/backend.service /etc/systemd/system/debttracker-backend.service
cp $APP_DIR/deploy/bot.service /etc/systemd/system/debttracker-bot.service
systemctl daemon-reload
systemctl enable debttracker-backend debttracker-bot
systemctl restart debttracker-backend debttracker-bot

echo "==> Configuring nginx"
sed "s/YOUR_DOMAIN_HERE/$DOMAIN/g" $APP_DIR/deploy/nginx.conf > /etc/nginx/sites-available/debttracker
ln -sf /etc/nginx/sites-available/debttracker /etc/nginx/sites-enabled/debttracker
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> Obtaining SSL certificate"
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

echo "==> Setting Telegram webhook"
BOT_TOKEN=$(grep BOT_TOKEN $APP_DIR/.env | cut -d= -f2)
curl -s "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=https://$DOMAIN/webhook" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Webhook set:', d.get('ok'))"

echo ""
echo "✅ Deployment complete!"
echo "   Frontend: https://$DOMAIN"
echo "   API:      https://$DOMAIN/api"
echo "   Bot:      @debtinexbot"
echo ""
echo "⚠️  Make sure to fill in ADMIN_TELEGRAM_ID in $APP_DIR/.env then restart the bot:"
echo "    systemctl restart debttracker-bot"
