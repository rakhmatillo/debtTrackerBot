---
name: project-debt-tracker-bot
description: Overview of the debtTrackerBot project architecture, components, and runtime topology
metadata:
  type: project
---

Telegram Mini App debt tracker. Bot username: @debtinexbot. Token: stored in .env.

**Components:**
- FastAPI backend on `http://127.0.0.1:8000` — serves both REST API (`/api/*`) and the React frontend at `/`
- React (Vite) frontend — built and served as static files from FastAPI
- python-telegram-bot (PTB) running in polling mode — separate process from the FastAPI server
- APScheduler running inside the bot process — fires `_reminders_job` and `_trial_warnings_job` every minute
- Cloudflare quick tunnel (`cloudflared tunnel --url`) — exposes the FastAPI backend publicly over HTTPS for the Mini App

**Key URLs (as of 2026-06-14 session):**
- Local backend: http://127.0.0.1:8000
- Tunnel URL (stale, was active): https://dry-opened-girls-sensors.trycloudflare.com (shut down at 13:09 UTC)
- Menu button currently points to the stale tunnel URL above

**Why:** Mini App must be served over HTTPS; Cloudflare quick tunnel provides a free ephemeral HTTPS URL without a domain.

**How to apply:** When diagnosing connectivity issues, always check whether the tunnel is still alive and whether the menu button URL matches the current tunnel URL.
