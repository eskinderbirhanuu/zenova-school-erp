import uuid
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.license import (
    SetupStatusResponse, ActivateValidateRequest, ActivateValidateResponse,
    ActivateInitializeRequest, ActivateInitializeResponse,
    ValidateLicenseTypeRequest, ValidateLicenseTypeResponse,
    InitializeMainRequest, InitializeMainResponse,
    InitializeBranchRequest, InitializeBranchResponse,
    CreateEmployeeRequest, CreateEmployeeResponse,
    VerifyContactRequest, VerifyContactResponse,
    ResetPasswordRequest, ResetPasswordResponse,
    IssueRecoveryCodeRequest, IssueRecoveryCodeResponse,
)
from app.services import license_service
from app.services.license_crypto import bind_license_to_hardware, invalidate_license_cache
from app.core.security import (
    get_password_hash,
    issue_password_recovery_code,
    verify_password_recovery_code,
    validate_password_strength,
)
from app.config import settings
from app.api.v1.deps import rate_limit, get_current_user
from app.services.watermark import watermark_seed_data, set_school_watermark
from app.core.permissions import require_permission, Permission
from app.models.school import School
from app.models.branch import Branch
from app.models.user import User
from app.models.role import Role
from app.models.license import License, LicenseType, LicenseStatus
import logging
logger = logging.getLogger(__name__)

router = APIRouter(tags=["activate"])

# Rate limiters for public activation endpoints
LICENSE_CHECK_LIMIT = rate_limit("license_check", 20, 300)       # 20 per 5 min
ACTIVATE_INIT_LIMIT = rate_limit("activate_init", 3, 3600)       # 3 per hour
RESET_PASSWORD_LIMIT = rate_limit("reset_password", 5, 900)      # 5 per 15 min
RECOVERY_ISSUE_LIMIT = rate_limit("recovery_issue", 10, 900)    # 10 per 15 min
RECOVERY_RESET_LIMIT = rate_limit("recovery_reset", 5, 900)     # 5 per 15 min


def _generate_employee_id(db: Session, role_prefix: str) -> str:
    """Generate a unique employee ID: ZNV-{prefix}-{random}"""
    while True:
        eid = f"ZNV-{role_prefix}-{secrets.token_hex(3).upper()}"
        exists = db.query(User).filter(User.employee_id == eid).first()
        if not exists:
            return eid


# ─── Legacy Endpoints (backward compatible) ──────────────

@router.get("/activate/status", response_model=SetupStatusResponse)
def activate_status(db: Session = Depends(get_db), _=Depends(LICENSE_CHECK_LIMIT)):
    school = db.query(School).filter(School.is_setup_complete == True).first()
    if not school:
        return SetupStatusResponse(
            license_verified=False, school_created=False,
            branch_created=False, admin_created=False, setup_complete=False,
        )
    branch = db.query(Branch).filter(Branch.school_id == school.id).first()
    admin = db.query(User).filter(
        User.school_id == school.id, User.role.has(name="ADMIN"),
    ).first()
    return SetupStatusResponse(
        license_verified=True, school_created=True,
        branch_created=branch is not None, admin_created=admin is not None,
        setup_complete=school.is_setup_complete,
    )


@router.post("/activate/validate", response_model=ActivateValidateResponse)
def activate_validate(data: ActivateValidateRequest, db: Session = Depends(get_db), _=Depends(LICENSE_CHECK_LIMIT)):
    result = license_service.verify_license(db, data.key)
    lic = license_service.get_license_status(db)
    return ActivateValidateResponse(
        valid=result["valid"],
        license_type=result.get("license_type"),
        max_branches=lic.max_users if lic else None,
        valid_until=lic.valid_until if lic else None,
        message=result["message"],
    )


@router.post("/activate/initialize", response_model=ActivateInitializeResponse, status_code=status.HTTP_201_CREATED)
def activate_initialize(data: ActivateInitializeRequest, db: Session = Depends(get_db), _=Depends(ACTIVATE_INIT_LIMIT)):
    existing = db.query(School).filter(School.is_setup_complete == True).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="System already activated")
    main = license_service.verify_license(db, data.key)
    if not main["valid"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="License validation failed")
    result = license_service.activate_system(
        db, main_key=data.key, school_name=data.school_name,
        school_code=data.school_code, admin_full_name=data.admin_full_name,
        admin_email=data.admin_email, admin_password=data.admin_password,
        admin_phone=data.admin_phone, logo_url=data.logo_url,
    )
    if not result["success"]:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result["message"])
    return ActivateInitializeResponse(**result)


# ─── New Activation Flow v2 ──────────────────────────────

@router.post("/activate/validate-type", response_model=ValidateLicenseTypeResponse)
def validate_license_type(data: ValidateLicenseTypeRequest, db: Session = Depends(get_db), _=Depends(LICENSE_CHECK_LIMIT)):
    """Public: Validate a license key and return its type (MAIN or BRANCH)."""
    result = license_service.verify_license(db, data.key)
    lic = db.query(License).filter(License.key == data.key).first()
    lic_type = lic.license_type.value if lic else None
    return ValidateLicenseTypeResponse(
        valid=result["valid"],
        license_type=lic_type,
        is_main=lic_type == LicenseType.MAIN.value if lic_type else False,
        is_branch=lic_type == LicenseType.BRANCH.value if lic_type else False,
        message=result["message"],
    )


@router.post("/activate/initialize-main", response_model=InitializeMainResponse, status_code=status.HTTP_201_CREATED)
def initialize_main(data: InitializeMainRequest, db: Session = Depends(get_db), _=Depends(ACTIVATE_INIT_LIMIT)):
    """Public: Activate school with MAIN license key. Creates school + admin."""
    existing = db.query(School).filter(School.is_setup_complete == True).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="System already activated")

    result = license_service.verify_license(db, data.key)
    if not result["valid"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="License validation failed")

    lic = db.query(License).filter(License.key == data.key).first()
    if lic and lic.license_type != LicenseType.MAIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a MAIN license key")

    # Create school
    school = School(
        id=str(uuid.uuid4()), name=data.school_name, code=data.school_code,
        logo_url=data.logo_url, is_setup_complete=False,
    )
    db.add(school)
    db.flush()

    # Link license to school
    if lic:
        lic.school_id = school.id
        lic.status = LicenseStatus.ACTIVE
        bind_license_to_hardware(db, lic.id)

    # Create admin with employee_id
    admin_employee_id = _generate_employee_id(db, "ADM")
    role = db.query(Role).filter(Role.name == "ADMIN").first()
    admin = User(
        id=str(uuid.uuid4()),
        email=data.admin_email,
        employee_id=admin_employee_id,
        hashed_password=get_password_hash(data.admin_password),
        full_name=data.admin_full_name,
        phone=data.admin_phone,
        role_id=role.id if role else None,
        school_id=school.id,
        is_active=True,
    )
    db.add(admin)
    db.flush()

    school.owner_id = admin.id
    school.is_setup_complete = True
    invalidate_license_cache()
    set_school_watermark(school.id, school.name)
    watermark_seed_data(db, school.id)
    db.commit()
    db.refresh(school)

    return InitializeMainResponse(
        success=True, school_id=school.id, admin_id=admin.id,
        admin_email=admin.email, admin_employee_id=admin_employee_id,
        message="School activated successfully. Admin login with employee_id.",
    )


@router.post("/activate/initialize-branch", response_model=InitializeBranchResponse, status_code=status.HTTP_201_CREATED)
def initialize_branch(data: InitializeBranchRequest, db: Session = Depends(get_db), _=Depends(ACTIVATE_INIT_LIMIT)):
    """Public: Activate branch with BRANCH license key on branch server.
    Creates branch + director user with auto-generated credentials."""
    school = db.query(School).filter(School.id == data.school_id, School.is_setup_complete == True).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found or not activated")

    result = license_service.verify_license(db, data.license_key)
    if not result["valid"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="License validation failed")

    lic = db.query(License).filter(License.key == data.license_key).first()
    if lic and lic.license_type != LicenseType.BRANCH:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a BRANCH license key")
    if lic and lic.school_id and lic.school_id != data.school_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License already used by another school")
    if lic and lic.branch_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License already used by another branch")

    # Create branch
    branch_code = f"{school.code}-BR{secrets.token_hex(2).upper()}"
    branch = Branch(
        id=str(uuid.uuid4()), name=f"{school.name} Branch", code=branch_code,
        school_id=data.school_id,
    )
    db.add(branch)
    db.flush()

    # Link license to branch
    if lic:
        lic.branch_id = branch.id
        lic.school_id = data.school_id
        lic.status = LicenseStatus.ACTIVE
        bind_license_to_hardware(db, lic.id)

    # Create director with auto-generated credentials
    director_password = secrets.token_hex(6)
    director_eid = _generate_employee_id(db, "DIR")
    role = db.query(Role).filter(Role.name == "DIRECTOR").first()
    director = User(
        id=str(uuid.uuid4()),
        email=f"director.{branch_code.lower()}@zenova.app",
        employee_id=director_eid,
        hashed_password=get_password_hash(director_password),
        full_name="Branch Director",
        role_id=role.id if role else None,
        school_id=data.school_id,
        branch_id=branch.id,
        must_change_password=True,
        is_active=True,
    )
    db.add(director)
    invalidate_license_cache()
    db.commit()

    return InitializeBranchResponse(
        success=True, branch_id=branch.id, branch_code=branch_code,
        director_employee_id=director_eid, director_password=director_password,
        message="Branch activated. Share employee_id and password with director.",
    )


@router.post("/employees/create", response_model=CreateEmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    data: CreateEmployeeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Director+ creates employees (teachers, finance, hr, etc.) with auto-generated ID."""
    if not current_user.school_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No school assigned")

    role = db.query(Role).filter(Role.name == data.role_name).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role '{data.role_name}' not found")

    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    password = data.password or secrets.token_hex(6)
    eid = _generate_employee_id(db, data.role_name[:3])

    user = User(
        id=str(uuid.uuid4()),
        school_id=current_user.school_id,
        email=data.email,
        employee_id=eid,
        hashed_password=get_password_hash(password),
        full_name=data.full_name,
        phone=data.phone,
        role_id=role.id,
        branch_id=data.branch_id or current_user.branch_id,
        must_change_password=True,
        is_active=True,
    )
    db.add(user)
    db.commit()

    return CreateEmployeeResponse(
        success=True, user_id=user.id, employee_id=eid,
        email=user.email, full_name=user.full_name, password=password,
        message=f"Employee created. Login with employee_id: {eid}",
    )


@router.post("/activate/recovery/issue", response_model=IssueRecoveryCodeResponse)
def issue_recovery_code(
    data: IssueRecoveryCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SETTINGS_MANAGE),
    _=Depends(RECOVERY_ISSUE_LIMIT),
):
    """Admin: Issue a time-bound recovery code for a user (600s TTL)."""
    user = db.query(User).filter(User.employee_id == data.employee_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Employee ID not found")
    if current_user.school_id and user.school_id != current_user.school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="User is not in your school")
    if user.is_superuser:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Cannot issue recovery code for super admin")
    code = issue_password_recovery_code(user.id, ttl_seconds=600)
    return IssueRecoveryCodeResponse(
        success=True, recovery_code=code, expires_in_seconds=600,
        message="Recovery code issued. Share it with the user — it expires in 10 minutes.",
    )


@router.post("/activate/recovery/reset", response_model=ResetPasswordResponse)
def reset_with_recovery_code(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
    _=Depends(RECOVERY_RESET_LIMIT),
):
    """Public: Reset password using a recovery code issued by an admin."""
    user = db.query(User).filter(User.employee_id == data.employee_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Employee ID not found")
    if user.is_superuser:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Super admin password cannot be reset via recovery code")
    if not verify_password_recovery_code(data.recovery_code, user.id):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired recovery code")
    valid, msg = validate_password_strength(data.new_password)
    if not valid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=msg)
    from app.core.security import verify_password
    if verify_password(data.new_password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="New password must be different from the current password")
    user.hashed_password = get_password_hash(data.new_password)
    user.must_change_password = False
    db.commit()
    return ResetPasswordResponse(
        success=True, message="Password reset successfully.",
    )


@router.post("/auth/verify-super-admin-contact", response_model=VerifyContactResponse)
def verify_super_admin_contact(data: VerifyContactRequest, db: Session = Depends(get_db), _=Depends(RESET_PASSWORD_LIMIT)):
    """Hidden endpoint: verify if contact matches Super Admin credentials.
    Used by 'Contact Support Team' on welcome page.

    Security note: this endpoint historically returned `is_super_admin=true` and a
    distinct "Welcome Super Admin" message, acting as a contact-enumeration oracle.
    It now returns a constant generic response so callers cannot confirm whether a
    given phone/email belongs to the Super Admin. Rate-limited to slow brute force.
    """
    # The match result is intentionally NOT surfaced to the client.
    if settings.super_admin_phone and settings.super_admin_email:
        is_match = (
            data.phone.strip() == settings.super_admin_phone and
            data.email.strip().lower() == settings.super_admin_email
        )
        if is_match:
            # Trigger an internal alert (audit) without revealing the result to the caller.
            try:
                from app.core.audit import log_audit
                log_audit(db, "system", "SUPER_ADMIN_CONTACT_MATCH", "users", "super_admin",
                          "Super Admin contact verified from welcome page")
                db.commit()
            except Exception:
                logger.warning("Failed to record audit for super admin contact match", exc_info=True)
    return VerifyContactResponse(
        verified=False,
        is_super_admin=False,
        message="Support ticket submitted. We will contact you.",
    )
