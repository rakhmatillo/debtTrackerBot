"""
Handles receipt photos/documents sent by users whose trial has expired.
Forwards them to the admin with a one-tap [✅ Confirm 30 days] inline button.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes

from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.models.user import User, UserStatus


def _access_expired(user: User) -> bool:
    now = datetime.now(timezone.utc)
    if user.status == UserStatus.paid and user.paid_until and user.paid_until > now:
        return False
    if user.status == UserStatus.approved and user.trial_end and user.trial_end > now:
        return False
    return True


async def receipt_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Called when a user sends any photo or document.
    If their access has expired, treat it as a payment receipt and forward to admin.
    """
    tg_user = update.effective_user

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.telegram_id == tg_user.id))
        user = result.scalar_one_or_none()

    if not user or not _access_expired(user):
        # User still has active access — ignore, don't intercept normal messages
        return

    name = tg_user.first_name or tg_user.username or f"id:{tg_user.id}"
    username_str = f"@{tg_user.username}" if tg_user.username else "no username"
    caption_for_admin = (
        f"📨 *Payment receipt received*\n\n"
        f"From: *{name}* ({username_str})\n"
        f"Telegram ID: `{tg_user.id}`\n\n"
        f"Tap ✅ to confirm payment and grant 30-day access, "
        f"or use `/confirm_payment {tg_user.id} <days>` for a custom duration."
    )

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(
                "✅ Confirm 30 days",
                callback_data=f"admin_confirm:{tg_user.id}:30",
            ),
            InlineKeyboardButton(
                "❌ Reject",
                callback_data=f"admin_reject:{tg_user.id}",
            ),
        ]
    ])

    message = update.message

    try:
        if message.photo:
            await context.bot.send_photo(
                chat_id=settings.ADMIN_TELEGRAM_ID,
                photo=message.photo[-1].file_id,
                caption=caption_for_admin,
                parse_mode="Markdown",
                reply_markup=keyboard,
            )
        elif message.document:
            await context.bot.send_document(
                chat_id=settings.ADMIN_TELEGRAM_ID,
                document=message.document.file_id,
                caption=caption_for_admin,
                parse_mode="Markdown",
                reply_markup=keyboard,
            )
        else:
            return
    except Exception:
        return

    # Acknowledge to user
    await message.reply_text(
        "✅ *Receipt received!*\n\n"
        "The admin has been notified and will review your payment.\n"
        "You'll get a message here once your access is activated.",
        parse_mode="Markdown",
    )
