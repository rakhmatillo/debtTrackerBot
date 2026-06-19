---
name: bug-sqlalchemy-mapper
description: CRITICAL bug — SQLAlchemy InvalidRequestError on Transaction model crashes _reminders_job every minute
metadata:
  type: project
---

Every minute, APScheduler fires `_reminders_job` inside the bot process. It immediately crashes with:

```
sqlalchemy.exc.InvalidRequestError: One or more mappers failed to initialize — can't proceed with initialization of other mappers.
Triggering mapper: 'Mapper[Transaction(transactions)]'.
Original exception was: Transaction.children and back-reference Transaction.parent are both of the same direction <RelationshipDirection.ONETOMANY: 1>.
Did you mean to set remote_side on the many-to-one side?
```

**Root cause:** The `Transaction` model in the backend has a self-referential relationship (`parent` / `children`) where both sides are declared as one-to-many. SQLAlchemy needs `remote_side` set on the many-to-one (parent) side to disambiguate.

**Fix:** In the Transaction model, add `remote_side=[Transaction.id]` to the `parent` relationship (the foreign-key side). Example:
```python
parent = relationship("Transaction", back_populates="children", remote_side=[id])
children = relationship("Transaction", back_populates="parent")
```

**Impact:** `_reminders_job` and `_trial_warnings_job` both fail silently every minute. No reminders are ever sent. The bot itself stays alive (PTB handles the exception and logs it), so polling and command handling still work.

**First observed:** 2026-06-14 bot_err.log line ~10, recurring every minute.

**Why:** Self-referential SQLAlchemy relationships require explicit `remote_side` to tell the ORM which side holds the FK.

**How to apply:** When fixing, go to the Transaction model definition and add `remote_side` to the parent-side relationship before the next scheduler run.
