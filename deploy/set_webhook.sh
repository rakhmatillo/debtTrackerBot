#!/bin/bash
# Run this after deploying to register the Telegram webhook
# Usage: bash set_webhook.sh YOUR_DOMAIN
DOMAIN=${1:?Usage: bash set_webhook.sh YOUR_DOMAIN}
BOT_TOKEN="8807182820:AAECiQ0JIzfyZrh9WDv2UGYV7oqJ6rXREOs"

echo "Setting webhook to https://$DOMAIN/webhook ..."
curl -s "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -d "url=https://$DOMAIN/webhook" \
  -d "allowed_updates=[\"message\",\"callback_query\"]" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok:', d.get('ok'), '|', d.get('description',''))"

echo "Setting Mini App button..."
curl -s "https://api.telegram.org/bot$BOT_TOKEN/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d "{\"menu_button\":{\"type\":\"web_app\",\"text\":\"Open App\",\"web_app\":{\"url\":\"https://$DOMAIN\"}}}" | python3 -c "import sys,json; d=json.load(sys.stdin); print('menu button:', d.get('ok'))"
