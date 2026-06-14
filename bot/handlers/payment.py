import os

from telegram import Update
from telegram.ext import ContextTypes

from app.core.config import settings


async def payment_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the 'Pay to Continue' button — sends payment details to user."""
    query = update.callback_query
    await query.answer()

    chat_id = query.message.chat_id

    if settings.PAYMENT_QR_PATH and os.path.exists(settings.PAYMENT_QR_PATH):
        with open(settings.PAYMENT_QR_PATH, "rb") as qr_file:
            await context.bot.send_photo(
                chat_id=chat_id,
                photo=qr_file,
                caption=(
                    "💳 *Payment Details*\n\n"
                    "Scan the QR code above to complete your payment.\n"
                    "Once paid, contact the admin and your access will be extended within 24 hours."
                ),
                parse_mode="Markdown",
            )
    elif settings.PAYMENT_LINK:
        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                f"💳 *Payment Details*\n\n"
                f"Use the link below to complete your payment:\n"
                f"{settings.PAYMENT_LINK}\n\n"
                f"Once paid, contact the admin and your access will be extended within 24 hours."
            ),
            parse_mode="Markdown",
        )
    else:
        await context.bot.send_message(
            chat_id=chat_id,
            text="Please contact the admin directly to arrange payment.",
        )
