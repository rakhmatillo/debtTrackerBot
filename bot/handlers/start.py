import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.ext import ContextTypes

from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.models.user import User, UserStatus


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    tg_user = update.effective_user
    chat_id = update.effective_chat.id

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.telegram_id == tg_user.id))
        user = result.scalar_one_or_none()

        if user is None:
            now = datetime.now(timezone.utc)
            user = User(
                telegram_id=tg_user.id,
                username=tg_user.username,
                first_name=tg_user.first_name,
                last_name=tg_user.last_name,
                status=UserStatus.approved,
                trial_start=now,
                trial_end=now + timedelta(days=settings.TRIAL_DAYS),
                approved_at=now,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

            trial_end_str = user.trial_end.strftime("%B %d, %Y")
            name = tg_user.first_name or tg_user.username or "there"

            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton(
                    "Open Debt Tracker",
                    web_app=WebAppInfo(url=settings.MINI_APP_URL),
                )]
            ])

            await context.bot.send_message(
                chat_id=chat_id,
                text=(
                    f"👋 Welcome, {name}!\n\n"
                    f"✅ Your *7-day free trial has started!*\n"
                    f"📅 Trial ends on *{trial_end_str}*\n\n"
                    f"Track your debts and loans — tap the button below to open the app."
                ),
                parse_mode="Markdown",
                reply_markup=keyboard,
            )

        elif user.status in (UserStatus.rejected, UserStatus.suspended):
            await context.bot.send_message(
                chat_id=chat_id,
                text="❌ Your access has been revoked. Contact the admin for help.",
            )

        else:
            now = datetime.now(timezone.utc)
            trial_active = user.trial_end and user.trial_end > now
            paid_active = user.paid_until and user.paid_until > now

            if trial_active or paid_active:
                keyboard = InlineKeyboardMarkup([
                    [InlineKeyboardButton(
                        "Open Debt Tracker",
                        web_app=WebAppInfo(url=settings.MINI_APP_URL),
                    )]
                ])
                if trial_active:
                    days_left = math.ceil((user.trial_end - now).total_seconds() / 86400)
                    status_line = f"⏳ Free trial — *{days_left} day(s) remaining*"
                else:
                    days_left = math.ceil((user.paid_until - now).total_seconds() / 86400)
                    status_line = f"✅ Subscription active — *{days_left} day(s) remaining*"

                await context.bot.send_message(
                    chat_id=chat_id,
                    text=f"Welcome back! {status_line}",
                    parse_mode="Markdown",
                    reply_markup=keyboard,
                )
            else:
                await _send_payment_prompt(context, chat_id)


async def _send_payment_prompt(context: ContextTypes.DEFAULT_TYPE, chat_id: int) -> None:
    text = (
        "⏰ *Your trial has expired.*\n\n"
        "To continue using the Debt Tracker, please subscribe.\n"
        "Tap the button below to get payment details."
    )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("💳 Pay to Continue", callback_data="request_payment")]
    ])
    await context.bot.send_message(
        chat_id=chat_id,
        text=text,
        parse_mode="Markdown",
        reply_markup=keyboard,
    )
