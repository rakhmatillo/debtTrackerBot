import logging
import os
import sys

from telegram import BotCommand
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    MessageHandler,
    filters,
)

_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # debtTrackerBot/
_bot_dir = os.path.dirname(os.path.abspath(__file__))               # debtTrackerBot/bot/
sys.path.insert(0, _root)
sys.path.insert(0, os.path.join(_root, "backend"))
sys.path.insert(0, _bot_dir)  # makes 'handlers' importable directly

from app.core.config import settings
from handlers.admin import (
    admin_confirm_payment,
    admin_set_access,
    admin_stats,
    admin_suspend,
    admin_users,
    inline_confirm_payment,
    inline_reject_payment,
)
from handlers.payment import payment_callback
from handlers.receipt import receipt_handler
from handlers.reminders import send_due_reminders, send_trial_expiry_warnings
from handlers.start import start

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Scheduled job wrappers (PTB job queue API) ────────────────────────────────

async def _reminders_job(context):
    await send_due_reminders(context.bot)


async def _trial_warnings_job(context):
    await send_trial_expiry_warnings(context.bot)


# ── Application builder ───────────────────────────────────────────────────────

def build_application() -> Application:
    app = Application.builder().token(settings.BOT_TOKEN).build()

    # Commands
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("admin_users", admin_users))
    app.add_handler(CommandHandler("suspend", admin_suspend))
    app.add_handler(CommandHandler("confirm_payment", admin_confirm_payment))
    app.add_handler(CommandHandler("stats", admin_stats))
    app.add_handler(CommandHandler("set_access", admin_set_access))

    # Callback queries
    app.add_handler(CallbackQueryHandler(payment_callback, pattern="^request_payment$"))
    app.add_handler(CallbackQueryHandler(inline_confirm_payment, pattern=r"^admin_confirm:\d+:\d+$"))
    app.add_handler(CallbackQueryHandler(inline_reject_payment, pattern=r"^admin_reject:\d+$"))

    # Receipt photos/documents
    app.add_handler(MessageHandler(filters.PHOTO | filters.Document.ALL, receipt_handler))

    # Background jobs via PTB's built-in job queue (no separate event loop needed)
    app.job_queue.run_repeating(_reminders_job, interval=60, first=10)
    app.job_queue.run_repeating(_trial_warnings_job, interval=86400, first=120)

    return app


# ── Polling mode (development — called directly) ──────────────────────────────

def run_polling() -> None:
    app = build_application()
    logger.info("Bot running in POLLING mode (@%s)…", "debtinexbot")
    # run_polling is synchronous and manages the event loop itself
    app.run_polling(drop_pending_updates=True)


# ── Webhook mode (production — called from FastAPI lifespan) ──────────────────

_app_instance: Application | None = None


async def start_webhook_app() -> Application:
    global _app_instance
    _app_instance = build_application()
    await _app_instance.initialize()
    await _app_instance.start()
    logger.info("Bot application started (webhook mode)")
    return _app_instance


async def stop_webhook_app() -> None:
    global _app_instance
    if _app_instance:
        await _app_instance.stop()
        await _app_instance.shutdown()
    logger.info("Bot application stopped")


def get_app() -> Application:
    if _app_instance is None:
        raise RuntimeError("Bot application not started")
    return _app_instance


if __name__ == "__main__":
    run_polling()
