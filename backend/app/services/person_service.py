from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.person import Person
from app.models.transaction import Transaction, TransactionType
from app.schemas.person import BalanceEntry, PersonCreate, PersonOut, PersonUpdate
from app.schemas.transaction import TransactionOut


def _compute_balances(transactions: list[Transaction]) -> list[BalanceEntry]:
    """Calculate net balance per currency from a flat transaction list."""
    net: dict[str, Decimal] = {}
    for txn in transactions:
        if txn.parent_id is not None:
            continue  # children are summed via parents
        children_total = sum(c.amount for c in txn.children)
        remaining = txn.amount - children_total
        currency = txn.currency
        if txn.type == TransactionType.lend:
            net[currency] = net.get(currency, Decimal(0)) + remaining
        else:
            net[currency] = net.get(currency, Decimal(0)) - remaining
    return [BalanceEntry(currency=k, net=v) for k, v in net.items() if v != 0]


def _txn_to_out(txn: Transaction) -> TransactionOut:
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
        children=[_txn_to_out(c) for c in sorted(txn.children, key=lambda c: c.date)],
    )


def _to_out(person: Person, include_transactions: bool = True) -> PersonOut:
    balances = _compute_balances(person.transactions)
    top_level = sorted(
        [t for t in person.transactions if t.parent_id is None],
        key=lambda t: t.date,
        reverse=True,
    )
    return PersonOut(
        id=person.id,
        name=person.name,
        currencies=person.currencies,
        is_archived=person.is_archived,
        reminder_at=person.reminder_at,
        created_at=person.created_at,
        balances=balances,
        transactions=[_txn_to_out(t) for t in top_level] if include_transactions else [],
    )


def _with_txns() -> list:
    """Standard selectinload options for person queries that need transactions."""
    return [selectinload(Person.transactions).selectinload(Transaction.children)]


async def _refetch_person(db: AsyncSession, person_id: int) -> Person:
    """Re-fetch a person with transactions eagerly loaded after a commit."""
    stmt = (
        select(Person)
        .where(Person.id == person_id)
        .options(*_with_txns())
    )
    result = await db.execute(stmt)
    return result.scalar_one()


class PersonService:
    @staticmethod
    async def list_persons(db: AsyncSession, user_id: int, archived: bool = False) -> list[PersonOut]:
        stmt = (
            select(Person)
            .where(Person.user_id == user_id, Person.is_archived == archived)
            .options(*_with_txns())
            .order_by(Person.name)
        )
        result = await db.execute(stmt)
        return [_to_out(p) for p in result.scalars().all()]

    @staticmethod
    async def get_person(db: AsyncSession, user_id: int, person_id: int) -> Optional[PersonOut]:
        stmt = (
            select(Person)
            .where(Person.id == person_id, Person.user_id == user_id)
            .options(*_with_txns())
        )
        result = await db.execute(stmt)
        person = result.scalar_one_or_none()
        return _to_out(person) if person else None

    @staticmethod
    async def create_person(db: AsyncSession, user_id: int, data: PersonCreate) -> PersonOut:
        person = Person(user_id=user_id, name=data.name, currencies=data.currencies)
        db.add(person)
        await db.commit()
        person = await _refetch_person(db, person.id)
        return _to_out(person)

    @staticmethod
    async def update_person(
        db: AsyncSession, user_id: int, person_id: int, data: PersonUpdate
    ) -> Optional[PersonOut]:
        stmt = (
            select(Person)
            .where(Person.id == person_id, Person.user_id == user_id)
        )
        result = await db.execute(stmt)
        person = result.scalar_one_or_none()
        if not person:
            return None
        if data.name is not None:
            person.name = data.name
        if data.currencies is not None:
            person.currencies = data.currencies
        await db.commit()
        person = await _refetch_person(db, person_id)
        return _to_out(person)

    @staticmethod
    async def delete_person(db: AsyncSession, user_id: int, person_id: int) -> bool:
        result = await db.execute(
            select(Person).where(Person.id == person_id, Person.user_id == user_id)
        )
        person = result.scalar_one_or_none()
        if not person:
            return False
        await db.delete(person)
        await db.commit()
        return True

    @staticmethod
    async def toggle_archive(db: AsyncSession, user_id: int, person_id: int) -> Optional[PersonOut]:
        result = await db.execute(
            select(Person).where(Person.id == person_id, Person.user_id == user_id)
        )
        person = result.scalar_one_or_none()
        if not person:
            return None
        person.is_archived = not person.is_archived
        if person.is_archived:
            person.reminder_at = None
        await db.commit()
        person = await _refetch_person(db, person_id)
        return _to_out(person)

    @staticmethod
    async def set_reminder(
        db: AsyncSession, user_id: int, person_id: int, reminder_at: Optional[datetime]
    ) -> Optional[PersonOut]:
        result = await db.execute(
            select(Person).where(Person.id == person_id, Person.user_id == user_id)
        )
        person = result.scalar_one_or_none()
        if not person:
            return None
        person.reminder_at = reminder_at
        await db.commit()
        person = await _refetch_person(db, person_id)
        return _to_out(person)
