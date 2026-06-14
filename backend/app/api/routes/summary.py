from decimal import Decimal

from fastapi import APIRouter

from app.core.deps import CurrentUser, DB
from app.services.person_service import PersonService

router = APIRouter(tags=["summary"])


@router.get("/summary")
async def get_summary(current_user: CurrentUser, db: DB):
    """Aggregate debt summary across all persons grouped by currency."""
    persons = await PersonService.list_persons(db, current_user.id, archived=False)

    owed_to_you: dict[str, Decimal] = {}
    you_owe: dict[str, Decimal] = {}

    for person in persons:
        for balance in person.balances:
            if balance.net > 0:
                owed_to_you[balance.currency] = owed_to_you.get(balance.currency, Decimal(0)) + balance.net
            elif balance.net < 0:
                you_owe[balance.currency] = you_owe.get(balance.currency, Decimal(0)) + abs(balance.net)

    return {
        "owed_to_you": {k: str(v) for k, v in owed_to_you.items()},
        "you_owe": {k: str(v) for k, v in you_owe.items()},
    }
