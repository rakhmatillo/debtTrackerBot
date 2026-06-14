import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from app.core.deps import CurrentUser, DB
from app.services.export_service import export_debts_csv, export_person_pdf
from app.services.import_service import ImportPreview, commit_import, preview_import

router = APIRouter(tags=["export-import"])


# ── Export ─────────────────────────────────────────────────────────────────────

@router.get("/export/debts")
async def export_debts(current_user: CurrentUser, db: DB):
    """Download all debts as CSV."""
    csv_bytes = await export_debts_csv(db, current_user.id)
    filename = f"debts_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/persons/{person_id}/pdf")
async def export_person_pdf_route(person_id: int, current_user: CurrentUser, db: DB):
    """Download a PDF debt report for one person."""
    pdf_bytes = await export_person_pdf(db, current_user.id, person_id)
    if pdf_bytes is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="debt_report_{person_id}.pdf"'},
    )


# ── Import ─────────────────────────────────────────────────────────────────────

class ImportPreviewOut(BaseModel):
    column_mapping: dict[str, str]
    detected_headers: list[str]
    sample_rows: list[dict]
    total_rows: int
    errors: list[str]


class ImportConfirmBody(BaseModel):
    column_mapping: dict[str, str]
    file_b64: str  # base64-encoded file contents


class ImportResultOut(BaseModel):
    created_persons: int
    created_transactions: int
    errors: list[str]


@router.post("/import/debts/preview", response_model=ImportPreviewOut)
async def import_preview(file: UploadFile, current_user: CurrentUser):
    """
    Upload a CSV and get back detected column mapping + sample rows.
    The client can adjust the mapping then call /import/debts/confirm.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    file_bytes = await file.read()
    preview: ImportPreview = preview_import(file_bytes)
    return ImportPreviewOut(
        column_mapping=preview.column_mapping,
        detected_headers=preview.detected_headers,
        sample_rows=preview.sample_rows,
        total_rows=preview.total_rows,
        errors=preview.errors,
    )


@router.post("/import/debts/confirm", response_model=ImportResultOut)
async def import_confirm(body: ImportConfirmBody, current_user: CurrentUser, db: DB):
    """Execute import using the confirmed (possibly user-adjusted) column mapping."""
    import base64
    try:
        file_bytes = base64.b64decode(body.file_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file_b64 encoding")

    result = await commit_import(db, current_user.id, file_bytes, body.column_mapping)
    return ImportResultOut(
        created_persons=result.created_persons,
        created_transactions=result.created_transactions,
        errors=result.errors,
    )
