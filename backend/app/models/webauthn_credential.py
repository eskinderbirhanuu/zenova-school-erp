import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from app.database import Base


class WebAuthnCredential(Base):
    __tablename__ = "webauthn_credentials"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    credential_id = Column(String(500), nullable=False, unique=True)
    public_key_cbor = Column(Text, nullable=False)
    sign_count = Column(String(20), nullable=False, default="0")
    device_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
