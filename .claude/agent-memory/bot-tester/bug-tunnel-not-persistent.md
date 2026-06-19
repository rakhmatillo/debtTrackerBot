---
name: bug-tunnel-not-persistent
description: Cloudflare quick tunnel is ephemeral — shuts down when the shell dies, leaving the menu button URL stale
metadata:
  type: project
---

The Cloudflare quick tunnel (`cloudflared tunnel --url http://127.0.0.1:8000`) was started on 2026-06-14 at ~12:29 UTC and shut down at 13:09 UTC when the session was interrupted.

The menu button URL registered with Telegram (`setChatMenuButton`) still points to the old tunnel URL `https://dry-opened-girls-sensors.trycloudflare.com`, which is no longer active.

Each time the tunnel restarts it gets a NEW random subdomain on trycloudflare.com, so the menu button URL must be updated via `setChatMenuButton` every time the tunnel restarts.

**Why:** Cloudflare quick tunnels are intentionally ephemeral and stateless. A named (authenticated) tunnel would keep the same URL but requires a Cloudflare account and `cloudflared login`.

**How to apply:** After restarting the tunnel, extract the new URL from cf_err.log (`$env:TEMP\cf_err.log`) and call `POST /setChatMenuButton` on the Telegram Bot API to update it. A startup script should automate this.
