from datetime import datetime
from pydantic import BaseModel, Field


class LicenseVerifyRequest(BaseModel):
    key: str = Field(..., min_length=10, max_length=255)


class LicenseVerifyResponse(BaseModel):
    valid: bool
    license_type: str | None = None
    message: str


class LicenseActivateRequest(BaseModel):
    key: str = Field(..., min_length=10, max_length=255)
    school_id: str


class LicenseActivateResponse(BaseModel):
    activated: bool
    message: str


class LicenseCreateRequest(BaseModel):
    key: str = Field(..., min_length=10, max_length=255)
    license_type: str = "trial"
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    max_users: str | None = None


class LicenseStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|expired|suspended|revoked)$")


class LicenseResponse(BaseModel):
    id: str
    key: str
    license_type: str
    status: str
    school_id: str | None
    branch_id: str | None
    valid_from: datetime
    valid_until: datetime | None
    max_users: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LicenseListResponse(BaseModel):
    licenses: list[LicenseResponse]
    total: int


class SchoolCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)
    address: str | None = None
    phone: str | None = None
    email: str | None = None


class SchoolResponse(BaseModel):
    id: str
    name: str
    code: str
    address: str | None
    phone: str | None
    email: str | None
    is_active: bool
    is_setup_complete: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SchoolBrandingResponse(BaseModel):
    name: str
    logo_url: str | None = None
    website: str | None = None
    is_setup_complete: bool


class BranchCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)
    address: str | None = None
    phone: str | None = None
    email: str | None = None


class BranchResponse(BaseModel):
    id: str
    name: str
    code: str
    address: str | None
    phone: str | None
    email: str | None
    school_id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SetupAdminRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    phone: str | None = None


class SetupAdminResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    message: str


class SetupStatusResponse(BaseModel):
    license_verified: bool
    school_created: bool
    branch_created: bool
    admin_created: bool
    setup_complete: bool


class LicenseStatusResponse(BaseModel):
    key: str
    license_type: str
    status: str
    valid_from: datetime
    valid_until: datetime | None
    max_users: str | None
    days_remaining: int | None
    is_expired: bool


class SetupValidateRequest(BaseModel):
    main_key: str = Field(..., min_length=10, max_length=255)
    branch_key: str = Field(..., min_length=10, max_length=255)


class SetupValidateResponse(BaseModel):
    valid: bool
    main_valid: bool
    branch_valid: bool
    main_message: str
    branch_message: str


class SetupInitializeRequest(BaseModel):
    main_key: str
    branch_key: str
    school_name: str = Field(..., min_length=2, max_length=255)
    school_code: str = Field(..., min_length=2, max_length=50)
    logo_url: str | None = None
    country: str | None = None
    region: str | None = None
    city: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    timezone: str | None = None
    admin_full_name: str = Field(..., min_length=2, max_length=255)
    admin_email: str = Field(..., max_length=255)
    admin_phone: str | None = None
    admin_password: str = Field(..., min_length=8, max_length=128)


class SetupInitializeResponse(BaseModel):
    success: bool
    school_id: str | None = None
    branch_id: str | None = None
    admin_id: str | None = None
    message: str


class ActivateValidateRequest(BaseModel):
    key: str = Field(..., min_length=10, max_length=255)


class ActivateValidateResponse(BaseModel):
    valid: bool
    license_type: str | None = None
    max_branches: str | None = None
    valid_until: datetime | None = None
    message: str


class ActivateInitializeRequest(BaseModel):
    key: str
    school_name: str = Field(..., min_length=2, max_length=255)
    school_code: str = Field(..., min_length=2, max_length=50)
    logo_url: str | None = None
    admin_full_name: str = Field(..., min_length=2, max_length=255)
    admin_email: str = Field(..., max_length=255)
    admin_phone: str | None = None
    admin_password: str = Field(..., min_length=8, max_length=128)


class ActivateInitializeResponse(BaseModel):
    success: bool
    school_id: str | None = None
    admin_id: str | None = None
    message: str


class BranchUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    code: str | None = Field(None, min_length=2, max_length=50)
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    is_active: bool | None = None


class BranchWithLicenseRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)
    address: str | None = None
    phone: str | None = None
    principal: str | None = None
    license_key: str = Field(..., min_length=10, max_length=255)


# ─── Activation Flow v2 ──────────────────────────────────

class ValidateLicenseTypeRequest(BaseModel):
    key: str = Field(..., min_length=10, max_length=255)


class ValidateLicenseTypeResponse(BaseModel):
    valid: bool
    license_type: str | None = None
    is_main: bool = False
    is_branch: bool = False
    message: str


class InitializeMainRequest(BaseModel):
    key: str = Field(..., min_length=10, max_length=255)
    school_name: str = Field(..., min_length=2, max_length=255)
    school_code: str = Field(..., min_length=2, max_length=50)
    logo_url: str | None = None
    admin_full_name: str = Field(..., min_length=2, max_length=255)
    admin_email: str = Field(..., max_length=255)
    admin_phone: str | None = None
    admin_password: str = Field(..., min_length=8, max_length=128)


class InitializeMainResponse(BaseModel):
    success: bool
    school_id: str | None = None
    admin_id: str | None = None
    admin_email: str | None = None
    admin_employee_id: str | None = None
    message: str


class InitializeBranchRequest(BaseModel):
    license_key: str = Field(..., min_length=10, max_length=255)
    school_id: str


class InitializeBranchResponse(BaseModel):
    success: bool
    branch_id: str | None = None
    branch_code: str | None = None
    director_employee_id: str | None = None
    director_password: str | None = None
    message: str


class CreateEmployeeRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., max_length=255)
    password: str | None = Field(None, min_length=8, max_length=128)
    phone: str | None = None
    role_name: str = Field(..., pattern="^(TEACHER|FINANCE|HR|INVENTORY|LIBRARY|CAFETERIA|AUDITOR|REGISTRAR)$")
    branch_id: str | None = None


class CreateEmployeeResponse(BaseModel):
    success: bool
    user_id: str | None = None
    employee_id: str | None = None
    email: str | None = None
    full_name: str | None = None
    password: str | None = None
    message: str


class VerifyContactRequest(BaseModel):
    phone: str = Field(..., max_length=50)
    email: str = Field(..., max_length=255)


class VerifyContactResponse(BaseModel):
    verified: bool
    is_super_admin: bool = False
    message: str


class ResetPasswordRequest(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=50)
    license_key: str = Field(..., min_length=10, max_length=255)
    new_password: str = Field(..., min_length=8, max_length=128)


class ResetPasswordResponse(BaseModel):
    success: bool
    message: str
