from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.user import UserStatus


class UserOut(BaseModel):
    telegram_id: int
    username: Optional[str]
    first_name: Optional[str]
    status: UserStatus
    trial_end: Optional[datetime]
    paid_until: Optional[datetime]

    model_config = {"from_attributes": True}
