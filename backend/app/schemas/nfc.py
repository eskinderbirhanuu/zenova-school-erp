from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class NFCAssignRequest(BaseModel):
    card_uid: str = Field(..., min_length=5, max_length=100)
    reference_type: str = Field(..., pattern="^(student|teacher|staff)$")
    reference_id: str
    school_id: str | None = None


class NFCResponse(BaseModel):
    id: str
    card_uid: str
    reference_type: str
    reference_id: str
    issue_date: datetime
    expiry_date: datetime | None
    status: str
    school_id: str | None
    assigned_by: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NFCValidateRequest(BaseModel):
    card_uid: str = Field(..., min_length=5, max_length=100)


class NFCValidateResponse(BaseModel):
    valid: bool
    reference_type: str | None
    reference_id: str | None
    status: str | None
    message: str


class NFCStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|expired|revoked|lost)$")


class NFCHistoryResponse(BaseModel):
    id: str
    card_uid: str
    reference_type: str
    reference_id: str
    status: str
    issue_date: datetime
    created_at: datetime
