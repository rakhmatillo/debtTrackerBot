import hashlib
import hmac
import json
import urllib.parse
from typing import Optional

from app.core.config import settings


def validate_telegram_init_data(init_data: str) -> Optional[dict]:
    """
    Validate Telegram WebApp initData signature.
    Returns parsed user dict if valid, None if invalid.
    """
    parsed = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        return None

    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(parsed.items())
    )

    secret_key = hmac.new(
        b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256
    ).digest()

    computed_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        return None

    user_str = parsed.get("user")
    if not user_str:
        return None

    return json.loads(user_str)
