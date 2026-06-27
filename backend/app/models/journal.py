import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Text, DateTime, Date, ForeignKey, DECIMAL, Boolean
from app.database import Base


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entry_number = Column(String(50), nullable=False)
    entry_date = Column(Date, nullable=False)
    description = Column(Text, nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    is_reversed = Column(Boolean, default=False)
    reversed_entry_id = Column(String(36), ForeignKey("journal_entries.id"), nullable=True)
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class JournalLine(Base):
    __tablename__ = "journal_lines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id"), nullable=False)
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=False)
    debit = Column(DECIMAL(15, 2), default=0.00)
    credit = Column(DECIMAL(15, 2), default=0.00)
    description = Column(String(500), nullable=True)
