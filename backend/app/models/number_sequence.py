import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from app.database import Base


class NumberSequence(Base):
    __tablename__ = "number_sequences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prefix = Column(String(20), nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    year = Column(Integer, nullable=False)
    last_number = Column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint("prefix", "school_id", "year", name="uq_prefix_school_year"),
    )
