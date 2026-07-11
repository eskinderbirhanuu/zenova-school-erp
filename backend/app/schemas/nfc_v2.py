from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class StudentCardResponse(BaseModel):
    id: str
    student_id: str
    school_id: str | None = None
    card_uid: str
    card_tier: str = "standard"
    status: str
    issue_date: datetime
    expiry_date: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StaffCardResponse(BaseModel):
    id: str
    staff_profile_id: str
    school_id: str | None = None
    card_uid: str
    card_tier: str = "standard"
    status: str
    issue_date: datetime
    expiry_date: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ParentCardResponse(BaseModel):
    id: str
    parent_id: str
    school_id: str | None = None
    card_uid: str
    card_tier: str = "standard"
    status: str
    issue_date: datetime
    expiry_date: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmployeeCardResponse(BaseModel):
    id: str
    employee_id: str
    school_id: str | None = None
    card_uid: str
    card_tier: str = "standard"
    status: str
    issue_date: datetime
    expiry_date: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NfcAssignRequest(BaseModel):
    card_uid: str = Field(..., min_length=5, max_length=100)
    reference_id: str
    card_tier: str = Field(default="standard", pattern="^(standard|premium)$")


class BulkAssignItem(BaseModel):
    card_type: str = Field(..., pattern="^(student|staff|parent|employee)$")
    reference_id: str
    card_uid: str = Field(..., min_length=5, max_length=100)
    card_tier: str = Field(default="standard", pattern="^(standard|premium)$")


class BulkAssignResult(BaseModel):
    success_count: int
    failure_count: int
    errors: list[dict] = []


class NfcScanRequest(BaseModel):
    card_uid: str = Field(..., min_length=5, max_length=100)
    scan_type: str = Field(default="verification", pattern="^(attendance|library|cafeteria|gate|verification)$")
    reader_location: str | None = None


class NfcScanResponse(BaseModel):
    success: bool
    card_uid: str
    reference_type: str
    reference_id: str
    person_name: str | None = None
    photo_url: str | None = None
    message: str


class CardPrintRequestCreate(BaseModel):
    card_type: str = Field(..., pattern="^(student|staff|parent|employee)$")
    reference_id: str
    notes: str | None = None


class CardPrintRequestResponse(BaseModel):
    id: str
    card_type: str
    reference_id: str
    school_id: str | None = None
    status: str
    requested_by: str | None
    approved_by: str | None
    printed_by: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class NfcScanLogResponse(BaseModel):
    id: str
    card_uid: str
    reference_type: str
    reference_id: str
    scan_type: str
    scanned_at: datetime
    reader_location: str | None
    school_id: str | None

    model_config = ConfigDict(from_attributes=True)
