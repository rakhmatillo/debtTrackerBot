from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Header, HTTPException
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import DB
from app.core.security import validate_telegram_init_data
from app.models.user import User, UserStatus
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
async def register(x_init_data: str = Header(alias="X-Init-Data"), db: DB = None):
    """
    Called when user opens Mini App for the first time.
    New users are automatically granted a free trial — no manual approval needed.
    """
    tg_user = validate_telegram_init_data(x_init_data)
    if not tg_user:
        raise HTTPException(status_code=401, detail="Invalid Telegram auth")

    result = await db.execute(select(User).where(User.telegram_id == tg_user["id"]))
    user = result.scalar_one_or_none()

    if user:
        return user

    now = datetime.now(timezone.utc)
    user = User(
        telegram_id=tg_user["id"],
        username=tg_user.get("username"),
        first_name=tg_user.get("first_name"),
        last_name=tg_user.get("last_name"),
        status=UserStatus.approved,
        trial_start=now,
        trial_end=now + timedelta(days=settings.TRIAL_DAYS),
        approved_at=now,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
async def me(x_init_data: str = Header(alias="X-Init-Data"), db: DB = None):
    """Returns current user status — used by frontend to check access."""
    tg_user = validate_telegram_init_data(x_init_data)
    if not tg_user:
        raise HTTPException(status_code=401, detail="Invalid Telegram auth")

    result = await db.execute(select(User).where(User.telegram_id == tg_user["id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
