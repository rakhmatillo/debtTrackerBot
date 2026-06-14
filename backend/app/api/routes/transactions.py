from fastapi import APIRouter, HTTPException

from app.core.deps import CurrentUser, DB
from app.schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate
from app.services.transaction_service import TransactionService

router = APIRouter(tags=["transactions"])


@router.post("/persons/{person_id}/transactions", response_model=TransactionOut, status_code=201)
async def add_transaction(person_id: int, body: TransactionCreate, current_user: CurrentUser, db: DB):
    txn = await TransactionService.create_transaction(db, current_user.id, person_id, body)
    if txn is None:
        raise HTTPException(status_code=404, detail="Person not found")
    if isinstance(txn, str):
        raise HTTPException(status_code=400, detail=txn)
    return txn


@router.put("/transactions/{txn_id}", response_model=TransactionOut)
async def update_transaction(txn_id: int, body: TransactionUpdate, current_user: CurrentUser, db: DB):
    txn = await TransactionService.update_transaction(db, current_user.id, txn_id, body)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn


@router.delete("/transactions/{txn_id}", status_code=204)
async def delete_transaction(txn_id: int, current_user: CurrentUser, db: DB):
    deleted = await TransactionService.delete_transaction(db, current_user.id, txn_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Transaction not found")
