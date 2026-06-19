---
name: bug-pending-page-dead-code
description: PendingPage.tsx exists but is never rendered — the "pending" user status was removed but the UI remnant was left behind
metadata:
  type: project
---

`frontend/src/pages/PendingPage.tsx` exists and renders a "Waiting for Approval" screen. However:
- It is never imported in `frontend/src/App.tsx`
- There is no route defined for it
- The `UserStatus` enum has no `pending` value — new users go directly to `approved`
- Both the bot `/start` handler and the backend `POST /auth/register` always create users with `status=UserStatus.approved`

**Why this matters:** The page implies the system once had a manual-approval workflow before the trial model was adopted. It is now unreachable dead code. If a future developer adds a `pending` status back, there is no route wiring to make PendingPage display.

**How to apply:** Either remove PendingPage.tsx or add a route + status check if a pending workflow is re-introduced. Do not assume this page is ever shown to users.
