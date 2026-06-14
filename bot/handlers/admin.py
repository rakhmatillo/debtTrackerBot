from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes

from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.models.user import User, UserStatus


def _is_admin(update: Update) -> bool:
    return update.effective_user.id == settings.ADMIN_TELEGRAM_ID


# ── /admin_users ─────────────────────────────────────────────────────────────

async def admin_users(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_admin(update):
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).order_by(User.created_at.desc()).limit(20))
        users = result.scalars().all()

    if not users:
        await update.message.reply_text("No users yet.")
        return

    now = datetime.now(timezone.utc)
    lines = []
    for u in users:
        name = u.first_name or u.username or f"id:{u.telegram_id}"
        if u.status == UserStatus.approved and u.trial_end:
            remaining = (u.trial_end - now).days
            state = f"trial ({remaining}d left)" if u.trial_end > now else "trial EXPIRED"
        elif u.status == UserStatus.paid and u.paid_until:
            state = f"paid until {u.paid_until.strftime('%b %d')}"
        else:
            state = u.status
        lines.append(f"• {name} — {state}")

    await update.message.reply_text(
        "*All Users (latest 20):*\n\n" + "\n".join(lines),
        parse_mode="Markdown",
    )


# ── /suspend <user_id> ────────────────────────────────────────────────────────

async def admin_suspend(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_admin(update):
        return

    args = context.args
    if not args:
        await update.message.reply_text("Usage: /suspend <telegram_user_id>")
        return

    try:
        tg_id = int(args[0])
    except ValueError:
        await update.message.reply_text("Invalid user ID.")
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.telegram_id == tg_id))
        user = result.scalar_one_or_none()
        if not user:
            await update.message.reply_text("User not found.")
            return
        user.status = UserStatus.suspended
        await db.commit()

    await update.message.reply_text(f"✅ User {tg_id} suspended.")
    await context.bot.send_message(
        chat_id=tg_id,
        text="❌ Your access has been suspended. Contact the admin for help.",
    )


# ── /confirm_payment <user_id> <days> ─────────────────────────────────────────

async def admin_confirm_payment(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_admin(update):
        return

    args = context.args
    if len(args) < 2:
        await update.message.reply_text("Usage: /confirm_payment <telegram_user_id> <days>")
        return

    try:
        tg_id = int(args[0])
        days = int(args[1])
    except ValueError:
        await update.message.reply_text("Invalid arguments.")
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.telegram_id == tg_id))
        user = result.scalar_one_or_none()
        if not user:
            await update.message.reply_text("User not found.")
            return

        now = datetime.now(timezone.utc)
        base = max(user.paid_until or now, now)
        user.paid_until = base + timedelta(days=days)
        user.status = UserStatus.paid
        await db.commit()
        expiry_str = user.paid_until.strftime("%B %d, %Y")

    await update.message.reply_text(
        f"✅ Payment confirmed for user {tg_id}.\nAccess extended until *{expiry_str}*.",
        parse_mode="Markdown",
    )
    await context.bot.send_message(
        chat_id=tg_id,
        text=(
            f"🎉 *Payment confirmed!*\n\n"
            f"Your access has been extended until *{expiry_str}*.\n"
            f"Thank you for subscribing!"
        ),
        parse_mode="Markdown",
    )


# ── /stats ────────────────────────────────────────────────────────────────────

async def admin_stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_admin(update):
        return

    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()

    total = len(users)
    active_trial = sum(
        1 for u in users
        if u.status == UserStatus.approved and u.trial_end and u.trial_end > now
    )
    expired_trial = sum(
        1 for u in users
        if u.status == UserStatus.approved and (not u.trial_end or u.trial_end <= now)
    )
    paid = sum(
        1 for u in users
        if u.status == UserStatus.paid and u.paid_until and u.paid_until > now
    )
    suspended = sum(1 for u in users if u.status == UserStatus.suspended)

    await update.message.reply_text(
        f"📊 *Stats*\n\n"
        f"Total users: {total}\n"
        f"Active trial: {active_trial}\n"
        f"Trial expired: {expired_trial}\n"
        f"Paid & active: {paid}\n"
        f"Suspended: {suspended}",
        parse_mode="Markdown",
    )
