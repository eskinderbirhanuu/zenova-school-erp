from datetime import datetime
from pydantic import BaseModel, Field


class QRGenerateRequest(BaseModel):
    reference_type: str = Field(..., pattern="^(student|parent|teacher|staff)$")
    reference_id: str
    school_id: str | None = None
    branch_id: str | None = None


class QRResponse(BaseModel):
    id: str
    uuid: str
    encrypted_token: str
    reference_type: str
    reference_id: str
    school_id: str | None
    branch_id: str | None
    is_active: bool
    created_at: datetime
    expires_at: datetime | None

    class Config:
        from_attributes = True


class QRValidateResponse(BaseModel):
    valid: bool
    reference_type: str | None
    reference_id: str | None
    message: str


class QRHistoryResponse(BaseModel):
    id: str
    uuid: str
    reference_type: str
    reference_id: str
    is_active: bool
    created_at: datetime
