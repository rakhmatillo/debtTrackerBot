# Bot Tester Agent Memory

- [Project: debtTrackerBot overview](project-debt-tracker-bot.md) — Telegram Mini App bot (@debtinexbot), FastAPI backend, React frontend, SQLAlchemy ORM, Cloudflare tunnel
- [Bug: SQLAlchemy Transaction self-referential mapper error](bug-sqlalchemy-mapper.md) — CRITICAL bug crashing _reminders_job every minute; Transaction.children/parent both ONETOMANY
- [Bug: Cloudflare tunnel not persistent](bug-tunnel-not-persistent.md) — tunnel shuts down when shell session ends; menu button URL becomes stale
- [Bug: PendingPage dead code](bug-pending-page-dead-code.md) — PendingPage.tsx never imported/routed; no pending status exists; leftover from old approval workflow
- [Bug: Auth error states indistinguishable in frontend](bug-security-hmac-api.md) — all auth errors (expired, suspended, invalid, network) silently collapse to PaywallPage with no distinction
