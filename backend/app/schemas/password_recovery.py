from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class InitiateOfflineRecoveryRequest(BaseModel):
    identifier: str = Field(..., description="Email or employee_id to recover")
    reason: Optional[str] = None


class InitiateOfflineRecoveryResponse(BaseModel):
    message: str
    request_id: str
    requires_approval: bool = True
    alternative_method: Optional[str] = None


class ApproveRecoveryRequest(BaseModel):
    request_id: str
    approved: bool = True
    reason: Optional[str] = None


class GenerateTempPasswordRequest(BaseModel):
    target_user_id: str
    reason: str = Field(default="Admin-initiated password reset", max_length=500)


class GenerateTempPasswordResponse(BaseModel):
    temp_password: str
    expires_at: datetime
    must_change_on_login: bool = True


class GenerateRecoveryCodesRequest(BaseModel):
    pass


class GenerateRecoveryCodesResponse(BaseModel):
    codes: list[str]
    message: str


class RecoveryCodeItem(BaseModel):
    id: str
    prefix: str
    is_used: bool
    created_at: datetime
    expires_at: Optional[datetime] = None


class ListRecoveryCodesResponse(BaseModel):
    codes: list[RecoveryCodeItem]


class VerifyRecoveryCodeRequest(BaseModel):
    code: str
    user_id: str


class VerifyRecoveryCodeResponse(BaseModel):
    valid: bool
    message: str


class ApplyRecoveryRequest(BaseModel):
    request_id: str
    new_password: str
    confirm_password: str


class ApplyRecoveryResponse(BaseModel):
    success: bool
    message: str


class GenerateEmergencyTokenRequest(BaseModel):
    target_user_id: str
    ttl_seconds: int = Field(default=3600, ge=300, le=86400)


class GenerateEmergencyTokenResponse(BaseModel):
    token: str
    expires_at: datetime
    command: str = "sudo zenova-reset-password <token>"


class EmergencyApplyRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str


class EmergencyApplyResponse(BaseModel):
    success: bool
    message: str


class PasswordAuditEntry(BaseModel):
    id: str
    action: str
    target_user_id: str
    initiated_by_user_id: Optional[str] = None
    approved_by_user_id: Optional[str] = None
    ip_address: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime


class ListAuditRequest(BaseModel):
    target_user_id: Optional[str] = None
    action: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class ListAuditResponse(BaseModel):
    entries: list[PasswordAuditEntry]
    total: int
