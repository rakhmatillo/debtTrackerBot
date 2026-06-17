"""Background job: fires due reminders and sends trial-expiry warnings."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.models.person import Person
from app.models.user import User, UserStatus


async def send_due_reminders(bot) -> None:
    """Called every minute by APScheduler. Sends reminder notifications."""
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Person)
            .where(Person.reminder_at <= now, Person.is_archived == False)  # noqa: E712
            .options(selectinload(Person.user))
            .limit(200)
        )
        persons = result.scalars().all()

        for person in persons:
            # Clear before attempting send so a failed delivery (blocked bot, rate
            # limit, stale chat ID) doesn't re-fire every minute indefinitely.
            person.reminder_at = None
            try:
                await bot.send_message(
                    chat_id=person.user.telegram_id,
                    text=(
                        f"🔔 *Reminder*\n\n"
                        f"You have a debt record with *{person.name}*.\n"
                        f"Open the app to review it."
                    ),
                    parse_mode="Markdown",
                )
            except Exception:
                pass

        await db.commit()


async def send_trial_expiry_warnings(bot) -> None:
    """Called once daily. Warns users whose trial expires in < 24 hours."""
    now = datetime.now(timezone.utc)
    warning_threshold = now + timedelta(hours=24)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(
                User.status == UserStatus.approved,
                User.trial_end > now,
                User.trial_end <= warning_threshold,
            )
        )
        users = result.scalars().all()

        for user in users:
            hours_left = int((user.trial_end - now).total_seconds() // 3600)
            try:
                await bot.send_message(
                    chat_id=user.telegram_id,
                    text=(
                        f"⚠️ *Trial ending soon!*\n\n"
                        f"Your free trial expires in *{hours_left} hour(s)*.\n\n"
                        f"Send /start to see payment options and keep your data."
                    ),
                    parse_mode="Markdown",
                )
            except Exception:
                pass
