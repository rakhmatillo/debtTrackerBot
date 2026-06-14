from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator


class PersonCreate(BaseModel):
    name: str
    currencies: list[str]

    @field_validator("currencies")
    @classmethod
    def max_three_currencies(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("At least one currency is required")
        if len(v) > 3:
            raise ValueError("Maximum 3 currencies allowed")
        return [c.upper() for c in v]


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    currencies: Optional[list[str]] = None

    @field_validator("currencies")
    @classmethod
    def max_three_currencies(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is not None:
            if not v:
                raise ValueError("At least one currency is required")
            if len(v) > 3:
                raise ValueError("Maximum 3 currencies allowed")
            return [c.upper() for c in v]
        return v


class BalanceEntry(BaseModel):
    currency: str
    net: Decimal  # positive = they owe you, negative = you owe them


class PersonOut(BaseModel):
    id: int
    name: str
    currencies: list[str]
    is_archived: bool
    reminder_at: Optional[datetime]
    created_at: datetime
    balances: list[BalanceEntry] = []
    transactions: list = []  # list[TransactionOut] — populated on detail fetch

    model_config = {"from_attributes": True}


class ReminderSet(BaseModel):
    reminder_at: datetime
