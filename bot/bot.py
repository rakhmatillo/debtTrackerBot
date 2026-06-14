import asyncio
import logging
import os
import sys

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from telegram.ext import Application, CallbackQueryHandler, CommandHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import settings
from bot.handlers.admin import (
    admin_confirm_payment,
    admin_stats,
    admin_suspend,
    admin_users,
)
from bot.handlers.payment import payment_callback
from bot.handlers.reminders import send_due_reminders, send_trial_expiry_warnings
from bot.handlers.start import start

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    app = Application.builder().token(settings.BOT_TOKEN).build()

    # ── Command handlers ───────────────────────────────────────────────────────
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("admin_users", admin_users))
    app.add_handler(CommandHandler("suspend", admin_suspend))
    app.add_handler(CommandHandler("confirm_payment", admin_confirm_payment))
    app.add_handler(CommandHandler("stats", admin_stats))

    # ── Callback query handlers ────────────────────────────────────────────────
    app.add_handler(CallbackQueryHandler(payment_callback, pattern="^request_payment$"))

    # ── Background scheduler ───────────────────────────────────────────────────
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        send_due_reminders,
        "interval",
        minutes=1,
        args=[app.bot],
        id="reminders",
    )
    scheduler.add_job(
        send_trial_expiry_warnings,
        "interval",
        hours=12,
        args=[app.bot],
        id="trial_warnings",
    )
    scheduler.start()

    logger.info("Bot starting…")
    await app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    asyncio.run(main())
