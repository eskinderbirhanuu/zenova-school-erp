from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.license import (
    SchoolCreateRequest,
    SchoolResponse,
    SchoolBrandingResponse,
    BranchCreateRequest,
    BranchResponse,
    SetupAdminRequest,
    SetupAdminResponse,
    SetupStatusResponse,
    SetupValidateRequest,
    SetupValidateResponse,
    SetupInitializeRequest,
    SetupInitializeResponse,
)
from app.services import license_service
from app.api.v1.deps import get_current_user, rate_limit as _rate_limit
from app.core.permissions import require_permission, Permission

SETUP_STATUS_LIMIT = _rate_limit("setup_status", limit=60, window_seconds=60)
SETUP_VALIDATE_LIMIT = _rate_limit("setup_validate", limit=20, window_seconds=300)
SETUP_INIT_LIMIT = _rate_limit("setup_init", limit=3, window_seconds=3600)
from app.models.user import User
from app.models.school import School
from app.models.branch import Branch
from app.models.license import License

router = APIRouter(tags=["setup"])


@router.get("/setup/status", response_model=SetupStatusResponse)
def public_setup_status(db: Session = Depends(get_db), _=Depends(SETUP_STATUS_LIMIT)):
    """Public: Check if system setup is complete (no auth required)"""
    school = db.query(School).filter(School.is_setup_complete == True).first()
    if not school:
        return SetupStatusResponse(
            license_verified=False, school_created=False,
            branch_created=False, admin_created=False, setup_complete=False,
        )
    branch = db.query(Branch).filter(Branch.school_id == school.id).first()
    admin = db.query(User).filter(
        User.school_id == school.id,
        User.role.has(name="ADMIN"),
    ).first()
    return SetupStatusResponse(
        license_verified=True,
        school_created=True,
        branch_created=branch is not None,
        admin_created=admin is not None,
        setup_complete=school.is_setup_complete,
    )


@router.get("/setup/school-branding", response_model=SchoolBrandingResponse)
def public_school_branding(db: Session = Depends(get_db), _=Depends(SETUP_STATUS_LIMIT)):
    """Public: Get school name + logo for login page (no auth required)"""
    school = db.query(School).filter(School.is_setup_complete == True).first()
    if not school:
        school = db.query(School).order_by(School.created_at.desc()).first()
    if not school:
        return SchoolBrandingResponse(name="", logo_url=None, website=None, is_setup_complete=False)
    return SchoolBrandingResponse(
        name=school.name,
        logo_url=school.logo_url,
        website=school.website,
        is_setup_complete=school.is_setup_complete,
    )


@router.post("/setup/validate", response_model=SetupValidateResponse)
def public_validate_licenses(data: SetupValidateRequest, db: Session = Depends(get_db), _=Depends(SETUP_VALIDATE_LIMIT)):
    """Public: Validate main + branch license keys (no auth required)"""
    main = license_service.verify_license(db, data.main_key)
    branch = license_service.verify_license(db, data.branch_key)
    return SetupValidateResponse(
        valid=main["valid"] and branch["valid"],
        main_valid=main["valid"],
        branch_valid=branch["valid"],
        main_message=main["message"],
        branch_message=branch["message"],
    )


@router.post("/setup/initialize", response_model=SetupInitializeResponse, status_code=status.HTTP_201_CREATED)
def public_initialize_system(data: SetupInitializeRequest, db: Session = Depends(get_db), _=Depends(SETUP_INIT_LIMIT)):
    """Public: Complete first-time system initialization (no auth required)"""
    existing = db.query(School).filter(School.is_setup_complete == True).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="System already initialized")

    main = license_service.verify_license(db, data.main_key)
    branch = license_service.verify_license(db, data.branch_key)
    if not main["valid"] or not branch["valid"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="License validation failed")

    result = license_service.initialize_system(
        db,
        main_key=data.main_key,
        branch_key=data.branch_key,
        school_name=data.school_name,
        school_code=data.school_code,
        logo_url=data.logo_url,
        country=data.country,
        region=data.region,
        city=data.city,
        address=data.address,
        phone=data.phone,
        email=data.email,
        timezone=data.timezone,
        admin_full_name=data.admin_full_name,
        admin_email=data.admin_email,
        admin_phone=data.admin_phone,
        admin_password=data.admin_password,
    )
    if not result["success"]:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result["message"])
    return SetupInitializeResponse(**result)


# ----- Authenticated endpoints (for post-setup management) -----

@router.post("/setup/school", response_model=SchoolResponse, status_code=status.HTTP_201_CREATED)
def setup_create_school(
    data: SchoolCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SCHOOL_MANAGE),
):
    """Create an additional school (requires auth)"""
    try:
        school = license_service.create_school(
            db, name=data.name, code=data.code,
            address=data.address, phone=data.phone, email=data.email,
        )
        return SchoolResponse.model_validate(school)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/setup/branch", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def setup_create_branch(
    school_id: str,
    data: BranchCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SCHOOL_MANAGE),
):
    """Create an additional branch (requires auth)"""
    try:
        branch = license_service.create_branch(
            db, school_id=school_id, name=data.name, code=data.code,
            address=data.address, phone=data.phone, email=data.email,
        )
        return BranchResponse.model_validate(branch)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/setup/admin", response_model=SetupAdminResponse, status_code=status.HTTP_201_CREATED)
def setup_create_admin(
    school_id: str,
    branch_id: str,
    data: SetupAdminRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SCHOOL_MANAGE),
):
    """Create an admin user for an existing school (requires auth)"""
    try:
        admin = license_service.create_setup_admin(
            db, school_id=school_id, branch_id=branch_id,
            full_name=data.full_name, email=data.email,
            password=data.password, phone=data.phone,
        )
        return SetupAdminResponse(
            user_id=admin.id,
            email=admin.email,
            full_name=admin.full_name,
            message="Admin account created successfully. Setup complete.",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
