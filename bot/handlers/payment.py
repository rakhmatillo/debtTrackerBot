import os

from telegram import Update
from telegram.ext import ContextTypes

from app.core.config import settings


async def payment_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the 'Pay to Continue' button — sends payment details then instructs user to send receipt."""
    query = update.callback_query
    await query.answer()

    chat_id = query.message.chat_id

    receipt_instruction = (
        "\n\n📎 *After paying:*\n"
        "Send a screenshot or photo of your payment receipt *right here* in this chat.\n"
        "The admin will review it and activate your account manually — usually within a few hours."
    )

    if settings.PAYMENT_QR_PATH and os.path.exists(settings.PAYMENT_QR_PATH):
        with open(settings.PAYMENT_QR_PATH, "rb") as qr_file:
            await context.bot.send_photo(
                chat_id=chat_id,
                photo=qr_file,
                caption=(
                    "💳 *Payment Details*\n\n"
                    "Scan the QR code above to complete your payment."
                    + receipt_instruction
                ),
                parse_mode="Markdown",
            )
    elif settings.PAYMENT_LINK:
        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                "💳 *Payment Details*\n\n"
                f"Complete your payment via this link:\n{settings.PAYMENT_LINK}"
                + receipt_instruction
            ),
            parse_mode="Markdown",
        )
    else:
        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                "💳 *Payment*\n\n"
                "Contact the admin to get payment details.\n"
                + receipt_instruction
            ),
            parse_mode="Markdown",
        )
