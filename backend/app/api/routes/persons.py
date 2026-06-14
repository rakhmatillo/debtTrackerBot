from fastapi import APIRouter, HTTPException

from app.core.deps import CurrentUser, DB
from app.schemas.person import PersonCreate, PersonOut, PersonUpdate, ReminderSet
from app.services.person_service import PersonService

router = APIRouter(prefix="/persons", tags=["persons"])


@router.get("", response_model=list[PersonOut])
async def list_persons(current_user: CurrentUser, db: DB, archived: bool = False):
    return await PersonService.list_persons(db, current_user.id, archived=archived)


@router.post("", response_model=PersonOut, status_code=201)
async def create_person(body: PersonCreate, current_user: CurrentUser, db: DB):
    return await PersonService.create_person(db, current_user.id, body)


@router.get("/{person_id}", response_model=PersonOut)
async def get_person(person_id: int, current_user: CurrentUser, db: DB):
    person = await PersonService.get_person(db, current_user.id, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.put("/{person_id}", response_model=PersonOut)
async def update_person(person_id: int, body: PersonUpdate, current_user: CurrentUser, db: DB):
    person = await PersonService.update_person(db, current_user.id, person_id, body)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.delete("/{person_id}", status_code=204)
async def delete_person(person_id: int, current_user: CurrentUser, db: DB):
    deleted = await PersonService.delete_person(db, current_user.id, person_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Person not found")


@router.post("/{person_id}/archive", response_model=PersonOut)
async def toggle_archive(person_id: int, current_user: CurrentUser, db: DB):
    person = await PersonService.toggle_archive(db, current_user.id, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.post("/{person_id}/reminder", response_model=PersonOut)
async def set_reminder(person_id: int, body: ReminderSet, current_user: CurrentUser, db: DB):
    person = await PersonService.set_reminder(db, current_user.id, person_id, body.reminder_at)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.delete("/{person_id}/reminder", response_model=PersonOut)
async def cancel_reminder(person_id: int, current_user: CurrentUser, db: DB):
    person = await PersonService.set_reminder(db, current_user.id, person_id, None)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person
