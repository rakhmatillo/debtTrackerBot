from decimal import Decimal
from typing import Optional, Union

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.person import Person
from app.models.transaction import Transaction, TransactionType
from app.schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate


def _to_out(txn: Transaction) -> TransactionOut:
    return TransactionOut(
        id=txn.id,
        person_id=txn.person_id,
        type=txn.type,
        amount=txn.amount,
        currency=txn.currency,
        note=txn.note,
        date=txn.date,
        parent_id=txn.parent_id,
        created_at=txn.created_at,
        children=[_to_out(c) for c in txn.children],
    )


async def _refetch_txn(db: AsyncSession, txn_id: int) -> Transaction:
    """Re-fetch a transaction with children eagerly loaded after a commit."""
    stmt = (
        select(Transaction)
        .where(Transaction.id == txn_id)
        .options(selectinload(Transaction.children))
    )
    result = await db.execute(stmt)
    return result.scalar_one()


class TransactionService:
    @staticmethod
    async def create_transaction(
        db: AsyncSession, user_id: int, person_id: int, data: TransactionCreate
    ) -> Union[TransactionOut, str, None]:
        result = await db.execute(
            select(Person).where(Person.id == person_id, Person.user_id == user_id)
        )
        person = result.scalar_one_or_none()
        if not person:
            return None

        if data.parent_id is not None:
            parent_result = await db.execute(
                select(Transaction)
                .where(Transaction.id == data.parent_id, Transaction.user_id == user_id)
                .options(selectinload(Transaction.children))
            )
            parent = parent_result.scalar_one_or_none()
            if not parent:
                return "Parent transaction not found"
            already_paid = sum(c.amount for c in parent.children)
            remaining = parent.amount - already_paid
            if data.amount > remaining:
                return f"Partial payment exceeds remaining balance of {remaining} {parent.currency}"

        txn = Transaction(
            person_id=person_id,
            user_id=user_id,
            type=data.type,
            amount=data.amount,
            currency=data.currency,
            note=data.note,
            date=data.date,
            parent_id=data.parent_id,
        )
        db.add(txn)
        await db.commit()
        txn = await _refetch_txn(db, txn.id)
        return _to_out(txn)

    @staticmethod
    async def update_transaction(
        db: AsyncSession, user_id: int, txn_id: int, data: TransactionUpdate
    ) -> Optional[TransactionOut]:
        result = await db.execute(
            select(Transaction).where(Transaction.id == txn_id, Transaction.user_id == user_id)
        )
        txn = result.scalar_one_or_none()
        if not txn:
            return None
        if data.amount is not None:
            txn.amount = data.amount
        if data.currency is not None:
            txn.currency = data.currency.upper()
        if data.note is not None:
            txn.note = data.note
        if data.date is not None:
            txn.date = data.date
        await db.commit()
        txn = await _refetch_txn(db, txn_id)
        return _to_out(txn)

    @staticmethod
    async def delete_transaction(db: AsyncSession, user_id: int, txn_id: int) -> bool:
        result = await db.execute(
            select(Transaction).where(Transaction.id == txn_id, Transaction.user_id == user_id)
        )
        txn = result.scalar_one_or_none()
        if not txn:
            return False
        await db.delete(txn)
        await db.commit()
        return True
