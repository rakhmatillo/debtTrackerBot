---
name: bug-security-hmac-api
description: security.py uses hmac.new() which does not exist in Python's standard library — correct call is hmac.new() → should be hmac.HMAC() or use hmac.new alias
metadata:
  type: project
---

In `backend/app/core/security.py` lines 24 and 28, the code calls `hmac.new(...)`. Python's `hmac` module does not expose a `.new()` function at the module level — the correct constructor is `hmac.new()` which is actually an alias defined in older docs but in CPython it is exposed as `hmac.new`. This needs verification at runtime.

**Actual status:** `hmac.new` IS a valid alias in CPython (it maps to `hmac.HMAC`), so this may work at runtime. However it is non-standard and not documented in Python 3 official docs — `hmac.new()` is the undocumented legacy alias. The canonical modern call is `hmac.new(key, msg, digestmod)` which is what the code uses. On closer inspection this is fine in CPython 3.x but worth flagging for clarity.

**More critical:** The function returns `None` on invalid init data, and the callers in `auth.py` raise HTTP 401. But `deps.py` (`get_current_user`) raises HTTP 403 (not_registered) if the user doesn't exist after valid auth, and raises HTTP 403 (access_denied) for rejected/suspended users. The frontend `useUser()` hook only calls `/auth/register` (POST) and ignores the error by calling `setGlobal(null)` — this means any 401/403 silently collapses to showing PaywallPage with no distinction between "invalid auth", "trial expired", "access denied", or "network error".

**How to apply:** When debugging auth failures from the Mini App side, remember that all error states (invalid initData, expired trial, suspended account, network failure) all render the same PaywallPage with no user-visible distinction.
