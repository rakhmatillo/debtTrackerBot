import sys
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.api.routes import auth, currencies, export_import, persons, summary, transactions
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT == "production":
        from bot.bot import start_webhook_app, stop_webhook_app
        await start_webhook_app()
        yield
        await stop_webhook_app()
    else:
        yield


app = FastAPI(
    title="DebtTracker Bot API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else [settings.MINI_APP_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(persons.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(summary.router, prefix="/api")
app.include_router(currencies.router, prefix="/api")
app.include_router(export_import.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/webhook")
async def telegram_webhook(request: Request):
    """Receives Telegram updates in production (webhook mode)."""
    if settings.ENVIRONMENT != "production":
        return JSONResponse({"ok": False, "error": "Webhook only active in production"}, status_code=400)

    from telegram import Update
    from bot.bot import get_app

    data = await request.json()
    bot_app = get_app()
    update = Update.de_json(data, bot_app.bot)
    await bot_app.process_update(update)
    return JSONResponse({"ok": True})


# Mount the React SPA at "/" — must come AFTER all API routes so it doesn't shadow them.
# html=True makes FastAPI serve index.html for any path not matched above (SPA routing).
_dist_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
app.mount("/", StaticFiles(directory=_dist_path, html=True), name="frontend")
