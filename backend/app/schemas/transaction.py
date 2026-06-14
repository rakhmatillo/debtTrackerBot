from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.transaction import TransactionType


class TransactionCreate(BaseModel):
    type: TransactionType
    amount: Decimal
    currency: str
    note: Optional[str] = None
    date: datetime
    parent_id: Optional[int] = None

    @field_validator("amount")
    @classmethod
    def positive_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v

    @field_validator("currency")
    @classmethod
    def upper_currency(cls, v: str) -> str:
        return v.upper()


class TransactionUpdate(BaseModel):
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    note: Optional[str] = None
    date: Optional[datetime] = None

    @field_validator("amount")
    @classmethod
    def positive_amount(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("Amount must be positive")
        return v


class TransactionOut(BaseModel):
    id: int
    person_id: int
    type: TransactionType
    amount: Decimal
    currency: str
    note: Optional[str]
    date: datetime
    parent_id: Optional[int]
    created_at: datetime
    children: list["TransactionOut"] = []

    model_config = {"from_attributes": True}


TransactionOut.model_rebuild()
