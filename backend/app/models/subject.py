import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from app.database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False)
    is_optional = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
