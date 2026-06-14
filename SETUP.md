# DebtTracker Bot — Setup Guide

Bot: @debtinexbot

---

## What you need before deploying

| Item | Where to get it |
|---|---|
| **Your Telegram ID** (ADMIN_TELEGRAM_ID) | Message [@userinfobot](https://t.me/userinfobot) — it replies with your ID |
| **A domain name** | Namecheap, GoDaddy, etc. (~$10/yr) — point it to your VPS IP |
| **A VPS** | DigitalOcean, Hetzner, Contabo — any Ubuntu 22.04 server ($5–6/mo) |
| **Payment link or QR** | Whatever you use to receive payments |

---

## Step 1 — Fill in .env

Open `.env` and set:

```
ADMIN_TELEGRAM_ID=your_telegram_id_here   # from @userinfobot
MINI_APP_URL=https://yourdomain.com
PAYMENT_LINK=https://your-payment-link    # OR leave blank and use PAYMENT_QR_PATH
```

Everything else is already filled in.

---

## Step 2 — Deploy to VPS (Ubuntu 22.04)

SSH into your server as root, then:

```bash
# Upload the project
scp -r /path/to/debtTrackerBot root@YOUR_VPS_IP:/tmp/debttracker

# On the server
cd /tmp/debttracker
bash deploy/deploy.sh yourdomain.com
```

The script will:
- Install Python 3.12, Node.js, nginx, PostgreSQL, certbot
- Create the database
- Install Python dependencies
- Build the React frontend
- Run database migrations
- Install and start systemd services
- Configure nginx with HTTPS (Let's Encrypt)
- Register the Telegram webhook

---

## Step 3 — Set the Mini App button (one-time)

After deploy, run:

```bash
bash deploy/set_webhook.sh yourdomain.com
```

This registers the webhook AND sets the "Open App" button in the bot menu.

---

## Step 4 — Verify everything works

1. Message @debtinexbot → `/start`
2. You should see the welcome message with trial info
3. Tap "Open App" → Mini App should open
4. As admin, try `/stats` → should show user count

---

## Admin commands

| Command | What it does |
|---|---|
| `/admin_users` | List all users with trial/subscription status |
| `/stats` | Total users, active trials, paid, suspended |
| `/suspend <telegram_id>` | Suspend a user |
| `/confirm_payment <telegram_id> <days>` | Grant paid access for N days |

**Payment approval flow:**
1. User's trial expires → they get payment info from bot
2. User pays → sends receipt photo to @debtinexbot
3. Bot forwards receipt to **you** with [✅ Confirm 30 days] [❌ Reject] buttons
4. You tap ✅ → user is instantly notified and gets access

---

## Local development

```bash
# Copy env
cp .env.example .env
# Edit .env (set ENVIRONMENT=development)

# Start Postgres via Docker
docker-compose up db -d

# Backend
cd backend
python -m venv venv
venv/Scripts/activate   # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Bot (polling mode)
python bot/bot.py

# Frontend
cd frontend
npm install
npm run dev
```

---

## File structure

```
debtTrackerBot/
├── backend/
│   ├── app/
│   │   ├── api/routes/     ← REST endpoints
│   │   ├── core/           ← config, auth, deps
│   │   ├── db/             ← SQLAlchemy engine
│   │   ├── models/         ← DB tables
│   │   ├── schemas/        ← Pydantic models
│   │   └── services/       ← business logic
│   └── alembic/            ← DB migrations
├── bot/
│   ├── bot.py              ← entry point, polling + webhook
│   └── handlers/           ← start, admin, payment, receipt, reminders
├── frontend/
│   └── src/
│       ├── pages/          ← all screens
│       ├── components/     ← shared UI
│       ├── hooks/          ← useCurrencies, useUser, useTelegramButton
│       ├── api/            ← typed API client
│       └── utils/          ← format, download helpers
├── deploy/
│   ├── deploy.sh           ← full VPS deployment script
│   ├── set_webhook.sh      ← register Telegram webhook + menu button
│   ├── nginx.conf          ← nginx template
│   ├── backend.service     ← systemd service for FastAPI
│   └── bot.service         ← systemd service for bot
├── .env                    ← your secrets (not committed)
├── .env.example            ← template
└── docker-compose.yml      ← local dev only
```

---

## Useful commands on VPS

```bash
# Check service status
systemctl status debttracker-backend
systemctl status debttracker-bot

# View logs
journalctl -u debttracker-backend -f
journalctl -u debttracker-bot -f

# Restart after code changes
systemctl restart debttracker-backend debttracker-bot

# Rebuild frontend after UI changes
cd /var/www/debttracker/frontend && npm run build && cp -r dist/* /var/www/debttracker/frontend_dist/
```
