import asyncio
import logging
import os
import sys

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    MessageHandler,
    filters,
)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import settings
from bot.handlers.admin import (
    admin_confirm_payment,
    admin_stats,
    admin_suspend,
    admin_users,
    inline_confirm_payment,
    inline_reject_payment,
)
from bot.handlers.payment import payment_callback
from bot.handlers.receipt import receipt_handler
from bot.handlers.reminders import send_due_reminders, send_trial_expiry_warnings
from bot.handlers.start import start

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def build_application() -> Application:
    app = Application.builder().token(settings.BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("admin_users", admin_users))
    app.add_handler(CommandHandler("suspend", admin_suspend))
    app.add_handler(CommandHandler("confirm_payment", admin_confirm_payment))
    app.add_handler(CommandHandler("stats", admin_stats))

    app.add_handler(CallbackQueryHandler(payment_callback, pattern="^request_payment$"))
    app.add_handler(CallbackQueryHandler(inline_confirm_payment, pattern=r"^admin_confirm:\d+:\d+$"))
    app.add_handler(CallbackQueryHandler(inline_reject_payment, pattern=r"^admin_reject:\d+$"))

    app.add_handler(MessageHandler(filters.PHOTO | filters.Document.ALL, receipt_handler))

    return app


def _add_scheduler(app: Application) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(send_due_reminders, "interval", minutes=1, args=[app.bot], id="reminders")
    scheduler.add_job(send_trial_expiry_warnings, "interval", hours=12, args=[app.bot], id="trial_warnings")
    return scheduler


# ── Polling mode (development) ────────────────────────────────────────────────

async def run_polling() -> None:
    app = build_application()
    scheduler = _add_scheduler(app)
    scheduler.start()
    logger.info("Bot running in POLLING mode…")
    await app.run_polling(drop_pending_updates=True)


# ── Webhook mode (production) — called from FastAPI lifespan ─────────────────

_app_instance: Application | None = None
_scheduler_instance: AsyncIOScheduler | None = None


async def start_webhook_app() -> Application:
    global _app_instance, _scheduler_instance
    _app_instance = build_application()
    await _app_instance.initialize()
    await _app_instance.start()
    _scheduler_instance = _add_scheduler(_app_instance)
    _scheduler_instance.start()
    logger.info("Bot application started (webhook mode)")
    return _app_instance


async def stop_webhook_app() -> None:
    global _app_instance, _scheduler_instance
    if _scheduler_instance:
        _scheduler_instance.shutdown(wait=False)
    if _app_instance:
        await _app_instance.stop()
        await _app_instance.shutdown()
    logger.info("Bot application stopped")


def get_app() -> Application:
    if _app_instance is None:
        raise RuntimeError("Bot application not started")
    return _app_instance


if __name__ == "__main__":
    asyncio.run(run_polling())
