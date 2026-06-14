"""CSV import for debts with auto column-mapping, validation, and preview."""
import csv
import io
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.person import Person
from app.models.transaction import Transaction, TransactionType

# Keywords used for auto column detection
_COL_KEYWORDS: dict[str, list[str]] = {
    "person":         ["person", "name", "contact", "debtor", "creditor"],
    "type":           ["type", "direction", "kind"],
    "amount":         ["amount", "sum", "value", "total"],
    "currency":       ["currency", "curr", "ccy"],
    "date":           ["date", "time", "when"],
    "note":           ["note", "description", "memo", "comment", "remark"],
    "transaction_id": ["transaction_id", "txn_id", "id"],
    "parent_id":      ["parent_transaction_id", "parent_id", "parent"],
}

_DATE_FORMATS = [
    "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y",
    "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y",
]


@dataclass
class ImportPreview:
    column_mapping: dict[str, str]          # field_name → csv_header
    detected_headers: list[str]
    sample_rows: list[dict]                 # first 3 rows for preview
    total_rows: int
    errors: list[str] = field(default_factory=list)


@dataclass
class ImportResult:
    created_persons: int = 0
    created_transactions: int = 0
    errors: list[str] = field(default_factory=list)


def _detect_mapping(headers: list[str]) -> dict[str, str]:
    """Auto-map field names to CSV headers by keyword matching."""
    mapping: dict[str, str] = {}
    lower_headers = [h.lower().strip() for h in headers]
    for field_name, keywords in _COL_KEYWORDS.items():
        for kw in keywords:
            for i, lh in enumerate(lower_headers):
                if kw in lh:
                    mapping[field_name] = headers[i]
                    break
            if field_name in mapping:
                break
    return mapping


def _parse_date(value: str) -> Optional[datetime]:
    value = value.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_type(value: str) -> Optional[TransactionType]:
    v = value.strip().lower()
    if v in ("lend", "lent", "loan", "gave", "out"):
        return TransactionType.lend
    if v in ("borrow", "borrowed", "owe", "took", "in"):
        return TransactionType.borrow
    return None


def preview_import(file_bytes: bytes) -> ImportPreview:
    """Parse uploaded CSV, detect columns, return preview (no DB writes)."""
    text = file_bytes.decode("utf-8-sig").strip()
    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []
    mapping = _detect_mapping(list(headers))

    rows = list(reader)
    sample = [dict(r) for r in rows[:3]]

    errors = []
    if "person" not in mapping:
        errors.append("Could not detect 'person/name' column.")
    if "amount" not in mapping:
        errors.append("Could not detect 'amount' column.")
    if "type" not in mapping:
        errors.append("Could not detect 'type' column (lend/borrow).")

    return ImportPreview(
        column_mapping=mapping,
        detected_headers=list(headers),
        sample_rows=sample,
        total_rows=len(rows),
        errors=errors,
    )


async def commit_import(
    db: AsyncSession,
    user_id: int,
    file_bytes: bytes,
    column_mapping: dict[str, str],
) -> ImportResult:
    """
    Execute the import using the confirmed column mapping.
    Creates Person records as needed (matched by name, case-insensitive).
    Handles parent_id references within the same file.
    """
    text = file_bytes.decode("utf-8-sig").strip()
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    result = ImportResult()
    person_cache: dict[str, Person] = {}
    txn_id_map: dict[str, int] = {}  # csv transaction_id → real DB id

    def get(row: dict, field_name: str, default: str = "") -> str:
        col = column_mapping.get(field_name)
        return row.get(col, default).strip() if col else default

    for i, row in enumerate(rows, start=2):
        row_label = f"Row {i}"

        person_name = get(row, "person")
        if not person_name:
            result.errors.append(f"{row_label}: missing person name, skipped.")
            continue

        amount_str = get(row, "amount")
        try:
            amount = Decimal(amount_str.replace(",", ""))
            if amount <= 0:
                raise ValueError
        except (InvalidOperation, ValueError):
            result.errors.append(f"{row_label}: invalid amount '{amount_str}', skipped.")
            continue

        type_str = get(row, "type")
        txn_type = _parse_type(type_str)
        if txn_type is None:
            result.errors.append(f"{row_label}: unknown type '{type_str}', skipped.")
            continue

        date_str = get(row, "date")
        txn_date = _parse_date(date_str) if date_str else datetime.now(timezone.utc)
        if txn_date is None:
            result.errors.append(f"{row_label}: could not parse date '{date_str}', using today.")
            txn_date = datetime.now(timezone.utc)

        currency = get(row, "currency", "USD").upper() or "USD"
        note = get(row, "note") or None
        csv_txn_id = get(row, "transaction_id")
        csv_parent_id = get(row, "parent_id")

        # Resolve or create person
        key = person_name.lower()
        if key not in person_cache:
            person = Person(
                user_id=user_id,
                name=person_name,
                currencies=[currency],
            )
            db.add(person)
            await db.flush()
            person_cache[key] = person
            result.created_persons += 1
        else:
            person = person_cache[key]
            if currency not in person.currencies and len(person.currencies) < 3:
                person.currencies = person.currencies + [currency]

        # Resolve parent
        db_parent_id: Optional[int] = None
        if csv_parent_id and csv_parent_id in txn_id_map:
            db_parent_id = txn_id_map[csv_parent_id]

        txn = Transaction(
            person_id=person.id,
            user_id=user_id,
            type=txn_type,
            amount=amount,
            currency=currency,
            note=note,
            date=txn_date,
            parent_id=db_parent_id,
        )
        db.add(txn)
        await db.flush()
        result.created_transactions += 1

        if csv_txn_id:
            txn_id_map[csv_txn_id] = txn.id

    await db.commit()
    return result
