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
)
from app.services import license_service
from app.services.license_crypto import bind_license_to_hardware, invalidate_license_cache
from app.core.security import get_password_hash
from app.models.school import School
from app.models.branch import Branch
from app.models.user import User
from app.models.role import Role
from app.models.license import License, LicenseType, LicenseStatus

router = APIRouter(tags=["activate"])


def _generate_employee_id(db: Session, role_prefix: str) -> str:
    """Generate a unique employee ID: ZNV-{prefix}-{random}"""
    while True:
        eid = f"ZNV-{role_prefix}-{secrets.token_hex(3).upper()}"
        exists = db.query(User).filter(User.employee_id == eid).first()
        if not exists:
            return eid


SUPER_ADMIN_CONTACT_PHONE = "0901482324"
SUPER_ADMIN_CONTACT_EMAIL = "eskinderbirhanuu@gmail.com"


# ─── Legacy Endpoints (backward compatible) ──────────────

@router.get("/activate/status", response_model=SetupStatusResponse)
def activate_status(db: Session = Depends(get_db)):
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
def activate_validate(data: ActivateValidateRequest, db: Session = Depends(get_db)):
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
def activate_initialize(data: ActivateInitializeRequest, db: Session = Depends(get_db)):
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
def validate_license_type(data: ValidateLicenseTypeRequest, db: Session = Depends(get_db)):
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
def initialize_main(data: InitializeMainRequest, db: Session = Depends(get_db)):
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
    db.commit()
    db.refresh(school)

    return InitializeMainResponse(
        success=True, school_id=school.id, admin_id=admin.id,
        admin_email=admin.email, admin_employee_id=admin_employee_id,
        message="School activated successfully. Admin login with employee_id.",
    )


@router.post("/activate/initialize-branch", response_model=InitializeBranchResponse, status_code=status.HTTP_201_CREATED)
def initialize_branch(data: InitializeBranchRequest, db: Session = Depends(get_db)):
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
def create_employee(data: CreateEmployeeRequest, db: Session = Depends(get_db)):
    """Director creates employees (teachers, finance, hr, etc.) with auto-generated ID."""
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
        email=data.email,
        employee_id=eid,
        hashed_password=get_password_hash(password),
        full_name=data.full_name,
        phone=data.phone,
        role_id=role.id,
        branch_id=data.branch_id,
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


@router.post("/activate/reset-password", response_model=ResetPasswordResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Public: Reset password using Employee ID + License Key (no email OTP needed)."""
    user = db.query(User).filter(User.employee_id == data.employee_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee ID not found")

    lic = db.query(License).filter(License.key == data.license_key).first()
    if not lic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License key not found")

    if lic.status != LicenseStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="License is not active")

    if user.school_id and lic.school_id and user.school_id != lic.school_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee ID and License Key do not belong to the same school")

    user.hashed_password = get_password_hash(data.new_password)
    user.must_change_password = False
    db.commit()

    return ResetPasswordResponse(
        success=True, message="Password reset successfully. Login with your Employee ID and new password.",
    )


@router.post("/auth/verify-super-admin-contact", response_model=VerifyContactResponse)
def verify_super_admin_contact(data: VerifyContactRequest, db: Session = Depends(get_db)):
    """Hidden endpoint: verify if contact matches Super Admin credentials.
    Used by 'Contact Support Team' on welcome page."""
    is_match = (
        data.phone.strip() == SUPER_ADMIN_CONTACT_PHONE or
        data.email.strip().lower() == SUPER_ADMIN_CONTACT_EMAIL or
        (data.phone.strip() == SUPER_ADMIN_CONTACT_PHONE and
         data.email.strip().lower() == SUPER_ADMIN_CONTACT_EMAIL)
    )
    return VerifyContactResponse(
        verified=is_match,
        is_super_admin=is_match,
        message="Welcome Super Admin" if is_match else "Support ticket submitted. We will contact you.",
    )
