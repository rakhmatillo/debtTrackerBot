import os
from dotenv import load_dotenv

# Load .env from backend/ dir, then fall back to project root
_here = os.path.dirname(os.path.abspath(__file__))
for _candidate in (
    os.path.join(_here, "..", "..", ".env"),   # backend/.env
    os.path.join(_here, "..", "..", "..", ".env"),  # project root .env
):
    if os.path.exists(_candidate):
        load_dotenv(_candidate)
        break


class Settings:
    BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
    ADMIN_TELEGRAM_ID: int = int(os.getenv("ADMIN_TELEGRAM_ID", "0"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    MINI_APP_URL: str = os.getenv("MINI_APP_URL", "")
    PAYMENT_LINK: str = os.getenv("PAYMENT_LINK", "")
    PAYMENT_QR_PATH: str = os.getenv("PAYMENT_QR_PATH", "")
    PAYMENT_CARD: str = os.getenv("PAYMENT_CARD", "")
    TRIAL_DAYS: int = int(os.getenv("TRIAL_DAYS", "7"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")


settings = Settings()
