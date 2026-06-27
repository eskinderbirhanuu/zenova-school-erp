import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from app.database import Base


class SchoolTelegramBot(Base):
    __tablename__ = "school_telegram_bots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False, unique=True)
    bot_token = Column(Text, nullable=False)
    bot_username = Column(String(100), nullable=True)
    bot_name = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    webhook_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
