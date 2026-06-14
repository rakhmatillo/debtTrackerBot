from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    BOT_TOKEN: str
    ADMIN_TELEGRAM_ID: int
    DATABASE_URL: str
    SECRET_KEY: str
    MINI_APP_URL: str
    PAYMENT_LINK: str = ""
    PAYMENT_QR_PATH: str = ""
    TRIAL_DAYS: int = 7
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
