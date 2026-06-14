from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import validate_telegram_init_data
from app.db.database import get_db
from app.models.user import User, UserStatus


async def get_current_user(
    x_init_data: Annotated[str, Header(alias="X-Init-Data")],
    db: AsyncSession = Depends(get_db),
) -> User:
    tg_user = validate_telegram_init_data(x_init_data)
    if not tg_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram auth")

    result = await db.execute(select(User).where(User.telegram_id == tg_user["id"]))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not_registered")

    if user.status in (UserStatus.rejected, UserStatus.suspended):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="access_denied")

    now = datetime.now(timezone.utc)

    if user.status == UserStatus.paid and user.paid_until and user.paid_until > now:
        return user

    if user.status == UserStatus.approved:
        if user.trial_end and user.trial_end > now:
            return user
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="trial_expired")

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="access_denied")


CurrentUser = Annotated[User, Depends(get_current_user)]
DB = Annotated[AsyncSession, Depends(get_db)]
