"""CSV and PDF export for debts."""
import csv
import io
from datetime import datetime, timezone
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.person import Person
from app.models.transaction import Transaction, TransactionType
from app.services.person_service import _compute_balances


# ── CSV export ────────────────────────────────────────────────────────────────

async def export_debts_csv(db: AsyncSession, user_id: int) -> bytes:
    """Export all persons + transactions as a flat CSV with hierarchy."""
    stmt = (
        select(Person)
        .where(Person.user_id == user_id)
        .options(selectinload(Person.transactions).selectinload(Transaction.children))
        .order_by(Person.name)
    )
    result = await db.execute(stmt)
    persons = result.scalars().all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "person", "transaction_id", "parent_transaction_id",
        "type", "amount", "currency", "date", "note",
    ])

    for person in persons:
        for txn in sorted(person.transactions, key=lambda t: t.date):
            if txn.parent_id is not None:
                continue  # written as children below
            writer.writerow([
                person.name,
                txn.id,
                "",
                txn.type,
                str(txn.amount),
                txn.currency,
                txn.date.strftime("%Y-%m-%d"),
                txn.note or "",
            ])
            for child in sorted(txn.children, key=lambda c: c.date):
                writer.writerow([
                    person.name,
                    child.id,
                    txn.id,
                    child.type,
                    str(child.amount),
                    child.currency,
                    child.date.strftime("%Y-%m-%d"),
                    child.note or "",
                ])

    return buf.getvalue().encode("utf-8-sig")  # BOM for Excel compatibility


# ── PDF export ────────────────────────────────────────────────────────────────

async def export_person_pdf(db: AsyncSession, user_id: int, person_id: int) -> bytes | None:
    """Generate a PDF debt report for one person. Returns None if not found."""
    stmt = (
        select(Person)
        .where(Person.id == person_id, Person.user_id == user_id)
        .options(selectinload(Person.transactions).selectinload(Transaction.children))
    )
    result = await db.execute(stmt)
    person = result.scalar_one_or_none()
    if not person:
        return None

    balances = _compute_balances(person.transactions)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.grey,
        spaceAfter=12,
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontSize=12,
        spaceBefore=12,
        spaceAfter=6,
    )

    story = []

    # Header
    story.append(Paragraph("Debt Report", title_style))
    story.append(Paragraph(person.name, ParagraphStyle(
        "Name", parent=styles["Heading1"], fontSize=14, spaceAfter=2,
    )))
    now_str = datetime.now(timezone.utc).strftime("%B %d, %Y %H:%M UTC")
    story.append(Paragraph(f"Generated: {now_str}", subtitle_style))
    story.append(Spacer(1, 4 * mm))

    # Balance summary
    story.append(Paragraph("Balance Summary", section_style))
    if balances:
        bal_data = [["Currency", "Net Balance", "Direction"]]
        for b in balances:
            net = Decimal(b.net)
            direction = "They owe you" if net > 0 else "You owe them"
            bal_data.append([b.currency, f"{abs(net):,.2f}", direction])
        bal_table = Table(bal_data, colWidths=[40 * mm, 60 * mm, 70 * mm])
        bal_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2d6a4f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f0f0")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(bal_table)
    else:
        story.append(Paragraph("No outstanding balance.", styles["Normal"]))

    story.append(Spacer(1, 6 * mm))

    # Transaction history
    story.append(Paragraph("Transaction History", section_style))
    parent_txns = [t for t in person.transactions if t.parent_id is None]
    parent_txns.sort(key=lambda t: t.date, reverse=True)

    if parent_txns:
        txn_data = [["Date", "Type", "Amount", "Currency", "Note"]]
        for txn in parent_txns:
            txn_data.append([
                txn.date.strftime("%Y-%m-%d"),
                "Lent" if txn.type == TransactionType.lend else "Borrowed",
                f"{txn.amount:,.2f}",
                txn.currency,
                txn.note or "",
            ])
            for child in sorted(txn.children, key=lambda c: c.date):
                paid_label = "↳ Partial payment" if txn.type == TransactionType.lend else "↳ Partial repay"
                txn_data.append([
                    child.date.strftime("%Y-%m-%d"),
                    paid_label,
                    f"  {child.amount:,.2f}",
                    child.currency,
                    child.note or "",
                ])

        txn_table = Table(
            txn_data,
            colWidths=[30 * mm, 35 * mm, 35 * mm, 20 * mm, None],
        )
        txn_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1b4332")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
            ("ALIGN", (2, 0), (2, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(txn_table)
    else:
        story.append(Paragraph("No transactions.", styles["Normal"]))

    doc.build(story)
    return buf.getvalue()
