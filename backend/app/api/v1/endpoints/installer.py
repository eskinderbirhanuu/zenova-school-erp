import uuid
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.installer import (
    InstallerStatusResponse, WhoAmIResponse,
    InitializeSuperAdminRequest, InitializeSuperAdminResponse,
    InitializeMainRequest, InitializeMainResponse,
    InitializeBranchRequest, InitializeBranchResponse,
)
from app.services import license_service
from app.services.license_crypto import bind_license_to_hardware, invalidate_license_cache
from app.core import server_identity
from app.api.v1.deps import rate_limit as _rate_limit

INSTALLER_STATUS_LIMIT = _rate_limit("installer_status", limit=60, window_seconds=60)
INSTALLER_INIT_LIMIT = _rate_limit("installer_init", limit=3, window_seconds=3600)
CONNECT_VPS_LIMIT = _rate_limit("connect_vps", limit=10, window_seconds=300)
from app.core.security import get_password_hash
from app.services.watermark import watermark_seed_data, set_school_watermark
from app.config import settings
from app.models.server import ServerIdentity, ServerRole
from app.models.school import School
from app.models.branch import Branch
from app.models.license import License, LicenseType, LicenseStatus
from app.models.user import User
from app.models.role import Role

_roles_seeded = False

def _ensure_roles(db: Session):
    global _roles_seeded
    if not _roles_seeded:
        license_service.ensure_default_roles(db)
        _roles_seeded = True

router = APIRouter(tags=["installer"])


class ConnectVpsRequest(BaseModel):
    vps_url: str
    school_id: str
    main_license: str


class ConnectVpsResponse(BaseModel):
    success: bool
    message: str


def _generate_employee_id(db: Session, role_prefix: str) -> str:
    while True:
        eid = f"ZNV-{role_prefix}-{secrets.token_hex(3).upper()}"
        exists = db.query(User).filter(User.employee_id == eid).first()
        if not exists:
            return eid


@router.get("/installer/status", response_model=InstallerStatusResponse)
def installer_status(db: Session = Depends(get_db), _=Depends(INSTALLER_STATUS_LIMIT)):
    identity = server_identity.get_server_identity()
    school = db.query(School).filter(School.is_setup_complete == True).first()
    has_master = bool(settings.master_setup_key)
    return InstallerStatusResponse(
        server_identity_exists=identity is not None,
        server_role=identity["server_role"] if identity else None,
        setup_complete=school.is_setup_complete if school else False,
        school_name=school.name if school else None,
        has_master_key=has_master,
    )


@router.post("/installer/initialize-super-admin", response_model=InitializeSuperAdminResponse, status_code=status.HTTP_201_CREATED)
def installer_init_super_admin(data: InitializeSuperAdminRequest, db: Session = Depends(get_db), _=Depends(INSTALLER_INIT_LIMIT)):
    _ensure_roles(db)

    if server_identity.is_already_registered():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Server already registered")

    if not settings.master_setup_key:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED,
                            detail="Master setup key not configured. Set MASTER_SETUP_KEY in .env")
    if data.master_setup_key != settings.master_setup_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid master setup key")

    result = license_service.verify_license(db, data.super_admin_license)
    if not result["valid"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Super admin license validation failed")

    lic = db.query(License).filter(License.key == data.super_admin_license).first()
    if lic and lic.license_type != LicenseType.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a SUPER_ADMIN license")
    if lic and lic.machine_fingerprint:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License already bound to another server")

    role = db.query(Role).filter(Role.name == "SUPER_ADMIN").first()
    if not role:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="SUPER_ADMIN role not found")

    eid = _generate_employee_id(db, "SUP")
    admin = User(
        id=str(uuid.uuid4()),
        email=data.email,
        employee_id=eid,
        hashed_password=get_password_hash(data.password),
        full_name="IGA Super Admin",
        role_id=role.id,
        is_active=True,
        is_superuser=True,
    )
    db.add(admin)
    db.flush()

    sid = server_identity.generate_server_id()
    identity = ServerIdentity(
        server_id=sid,
        fingerprint_sha256=data.fingerprint,
        server_role=ServerRole.SUPER_ADMIN,
        is_trusted=True,
    )
    db.add(identity)

    if lic:
        lic.status = LicenseStatus.ACTIVE
        bind_license_to_hardware(db, lic.id)

    server_identity.save_server_identity(sid, "SUPER_ADMIN")
    invalidate_license_cache()
    db.commit()

    return InitializeSuperAdminResponse(
        success=True, server_id=sid, email=data.email,
        message="Super admin server activated successfully",
    )


@router.post("/installer/initialize-main", response_model=InitializeMainResponse, status_code=status.HTTP_201_CREATED)
def installer_init_main(data: InitializeMainRequest, db: Session = Depends(get_db), _=Depends(INSTALLER_INIT_LIMIT)):
    _ensure_roles(db)

    if server_identity.is_already_registered():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Server already registered")

    school = db.query(School).filter(
        (School.id == data.school_id) | (School.code == data.school_id),
        School.deleted_at.is_(None)
    ).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")

    result = license_service.verify_license(db, data.main_license)
    if not result["valid"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="License validation failed")

    lic = db.query(License).filter(License.key == data.main_license).first()
    if lic and lic.license_type != LicenseType.MAIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a MAIN license")
    if lic and lic.machine_fingerprint:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License already bound to another server")

    sid = server_identity.generate_server_id()
    identity = ServerIdentity(
        server_id=sid,
        school_id=school.id,
        fingerprint_sha256=data.fingerprint,
        server_role=ServerRole.MAIN_SCHOOL,
        is_trusted=True,
    )
    db.add(identity)

    if lic:
        lic.school_id = school.id
        lic.status = LicenseStatus.ACTIVE
        bind_license_to_hardware(db, lic.id)
        school.main_license_key = data.main_license

    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    if not admin_role:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="ADMIN role not found")

    eid = _generate_employee_id(db, "ADM")
    admin_user = User(
        id=str(uuid.uuid4()),
        email=data.admin_email,
        employee_id=eid,
        hashed_password=get_password_hash(data.admin_password),
        full_name="School Administrator",
        role_id=admin_role.id,
        school_id=school.id,
        is_active=True,
        is_superuser=False,
    )
    db.add(admin_user)

    school.is_setup_complete = True
    server_identity.save_server_identity(sid, "MAIN_SCHOOL", school.id)
    invalidate_license_cache()
    set_school_watermark(school.id, school.name)
    watermark_seed_data(db, school.id)
    db.commit()

    return InitializeMainResponse(
        success=True, server_id=sid, school_id=school.id,
        admin_email=data.admin_email,
        message="Main school server activated successfully",
    )


@router.post("/installer/initialize-branch", response_model=InitializeBranchResponse, status_code=status.HTTP_201_CREATED)
def installer_init_branch(data: InitializeBranchRequest, db: Session = Depends(get_db), _=Depends(INSTALLER_INIT_LIMIT)):
    _ensure_roles(db)

    if server_identity.is_already_registered():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Server already registered")

    school = db.query(School).filter(
        (School.id == data.school_id) | (School.code == data.school_id),
        School.deleted_at.is_(None)
    ).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")

    branch = db.query(Branch).filter(
        Branch.id == data.branch_id,
        Branch.school_id == school.id,
        Branch.deleted_at.is_(None)
    ).first()
    if not branch:
        branch = db.query(Branch).filter(
            Branch.code == data.branch_id,
            Branch.school_id == school.id,
            Branch.deleted_at.is_(None)
        ).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    result = license_service.verify_license(db, data.branch_license)
    if not result["valid"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Branch license validation failed")

    lic = db.query(License).filter(License.key == data.branch_license).first()
    if lic and lic.branch_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License already bound to another branch")

    parent = db.query(ServerIdentity).filter(
        ServerIdentity.school_id == school.id,
        ServerIdentity.server_role == ServerRole.MAIN_SCHOOL
    ).first()

    sid = server_identity.generate_server_id()
    identity = ServerIdentity(
        server_id=sid,
        school_id=school.id,
        branch_id=branch.id,
        parent_server_id=parent.server_id if parent else None,
        fingerprint_sha256=data.fingerprint,
        server_role=ServerRole.BRANCH,
        vps_url=data.vps_url or None,
    )
    db.add(identity)

    if lic:
        lic.branch_id = branch.id
        lic.school_id = school.id
        lic.status = LicenseStatus.ACTIVE
        bind_license_to_hardware(db, lic.id)
        branch.branch_license_key = data.branch_license

    admin_email = None
    if data.admin_email and data.admin_password:
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        if admin_role:
            eid = _generate_employee_id(db, "ADM")
            admin_user = User(
                id=str(uuid.uuid4()),
                email=data.admin_email,
                employee_id=eid,
                hashed_password=get_password_hash(data.admin_password),
                full_name="Branch Administrator",
                role_id=admin_role.id,
                school_id=school.id,
                branch_id=branch.id,
                is_active=True,
                is_superuser=False,
            )
            db.add(admin_user)
            admin_email = data.admin_email

    server_identity.save_server_identity(sid, "BRANCH", school.id, branch.id)
    invalidate_license_cache()
    db.commit()

    return InitializeBranchResponse(
        success=True, server_id=sid, branch_id=branch.id,
        admin_email=admin_email,
        message="Branch server activated successfully",
    )


@router.get("/installer/whoami", response_model=WhoAmIResponse)
def installer_whoami():
    identity = server_identity.get_server_identity()
    if not identity:
        return WhoAmIResponse(
            is_super_admin=False, is_main_school=False,
            is_branch=False, server_role=None,
        )
    role = identity.get("server_role")
    return WhoAmIResponse(
        is_super_admin=role == "SUPER_ADMIN",
        is_main_school=role == "MAIN_SCHOOL",
        is_branch=role == "BRANCH",
        server_role=role,
    )


@router.post("/installer/connect-vps", response_model=ConnectVpsResponse)
def connect_vps(data: ConnectVpsRequest, db: Session = Depends(get_db), _=Depends(CONNECT_VPS_LIMIT)):
    identity = server_identity.get_server_identity()
    if not identity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Server not registered. Run installer first.")

    server_role = identity.get("server_role")
    if server_role not in ("MAIN_SCHOOL", "BRANCH"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only school servers can connect to VPS")

    school = db.query(School).filter(
        (School.id == data.school_id) | (School.code == data.school_id),
        School.deleted_at.is_(None)
    ).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")

    lic = db.query(License).filter(License.key == data.main_license).first()
    if not lic or lic.status != LicenseStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or inactive license")

    sid = identity.get("server_id")
    server_ident = db.query(ServerIdentity).filter(
        ServerIdentity.server_id == sid
    ).first()

    if server_ident:
        server_ident.vps_url = data.vps_url
        server_ident.sync_enabled = True
        db.commit()

    return ConnectVpsResponse(
        success=True,
        message=f"VPS connected successfully at {data.vps_url}. Sync will begin shortly.",
    )
