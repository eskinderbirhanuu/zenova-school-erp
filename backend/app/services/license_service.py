import uuid
import hashlib
import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.license import License, LicenseType, LicenseStatus
from app.models.school import School
from app.models.branch import Branch
from app.models.user import User
from app.models.role import Role
from app.models.academic_year import AcademicYear
from app.core.security import get_password_hash
from app.core.audit import log_audit
from app.core.permissions import ROLE_PERMISSIONS


def generate_license_key() -> str:
    """Generate a license key in format: ZNV-XXXX-XXXX-XXXX-XXXX"""
    segments = []
    for _ in range(4):
        segment = secrets.token_hex(2).upper()
        segments.append(segment)
    return f"ZNV-{segments[0]}-{segments[1]}-{segments[2]}-{segments[3]}"


def verify_license_key_format(key: str) -> bool:
    """Validate license key format: ZNV-XXXX-XXXX-XXXX-XXXX"""
    import re
    pattern = r"^ZNV-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$"
    return bool(re.match(pattern, key))


def checksum_valid(key: str) -> bool:
    """Simple checksum validation for license key"""
    clean = key.replace("-", "")
    total = sum(ord(c) for c in clean[:-1])
    check_char = clean[-1]
    expected = chr(65 + (total % 26))
    return check_char == expected


def verify_license(db: Session, key: str) -> dict:
    """Verify a license key exists and is valid"""
    if not verify_license_key_format(key):
        return {"valid": False, "message": "Invalid license key format"}

    license_record = db.query(License).filter(License.key == key).first()

    if not license_record:
        return {"valid": False, "message": "License key not found"}

    if license_record.status == LicenseStatus.SUSPENDED:
        return {"valid": False, "message": "License has been suspended"}

    if license_record.status == LicenseStatus.REVOKED:
        return {"valid": False, "message": "License has been revoked"}

    if license_record.status == LicenseStatus.EXPIRED:
        return {"valid": False, "message": "License has expired"}

    if license_record.valid_until and license_record.valid_until < datetime.utcnow():
        license_record.status = LicenseStatus.EXPIRED
        db.commit()
        return {"valid": False, "message": "License has expired"}

    return {
        "valid": True,
        "license_type": license_record.license_type.value,
        "message": "License key is valid",
    }


def activate_license(db: Session, key: str, school_id: str) -> dict:
    """Activate a license for a specific school"""
    license_record = db.query(License).filter(License.key == key).first()

    if not license_record:
        return {"activated": False, "message": "License key not found"}

    if license_record.school_id:
        return {"activated": False, "message": "License already activated for a school"}

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        return {"activated": False, "message": "School not found"}

    from app.services.license_crypto import bind_license_to_hardware, invalidate_license_cache
    license_record.school_id = school_id
    license_record.status = LicenseStatus.ACTIVE
    bind_license_to_hardware(db, license_record.id)
    invalidate_license_cache()
    db.commit()

    log_audit(
        db=db,
        table_name="licenses",
        record_id=license_record.id,
        action="LICENSE_ACTIVATED",
        new_data={"key": key, "school_id": school_id},
    )

    return {"activated": True, "message": "License activated successfully"}


def create_license(
    db: Session,
    key: str,
    license_type: str,
    valid_from: datetime | None = None,
    valid_until: datetime | None = None,
    max_users: str | None = None,
) -> License:
    """Create a new license (SUPER_ADMIN only)"""
    existing = db.query(License).filter(License.key == key).first()
    if existing:
        raise ValueError("License key already exists")

    if valid_from is None:
        valid_from = datetime.utcnow()

    type_enum = LicenseType(license_type)

    license_record = License(
        key=key,
        license_type=type_enum,
        status=LicenseStatus.ACTIVE,
        valid_from=valid_from,
        valid_until=valid_until,
        max_users=max_users,
    )
    db.add(license_record)
    db.commit()
    db.refresh(license_record)
    return license_record


def update_license_status(db: Session, license_id: str, status: str) -> License | None:
    """Update license status (SUPER_ADMIN only)"""
    license_record = db.query(License).filter(License.id == license_id).first()
    if not license_record:
        return None

    old_status = license_record.status.value
    license_record.status = LicenseStatus(status)
    db.commit()

    log_audit(
        db=db,
        table_name="licenses",
        record_id=license_record.id,
        action="LICENSE_STATUS_CHANGED",
        old_data={"status": old_status},
        new_data={"status": status},
    )

    return license_record


def get_license_status(db: Session, school_id: str | None = None) -> License | None:
    """Get current license status for a school or any"""
    query = db.query(License)
    if school_id:
        query = query.filter(License.school_id == school_id)
    return query.order_by(License.created_at.desc()).first()


def create_school(db: Session, name: str, code: str, address: str | None = None,
                  phone: str | None = None, email: str | None = None,
                  logo_url: str | None = None) -> School:
    """Create a new school"""
    existing = db.query(School).filter(School.code == code).first()
    if existing:
        raise ValueError(f"School code '{code}' already exists")

    school = School(
        name=name,
        code=code,
        address=address,
        phone=phone,
        email=email,
        logo_url=logo_url,
    )
    db.add(school)
    db.commit()
    db.refresh(school)

    log_audit(
        db=db,
        table_name="schools",
        record_id=school.id,
        action="SCHOOL_CREATED",
        new_data={"name": name, "code": code},
    )

    return school


def create_branch(db: Session, school_id: str, name: str, code: str,
                  address: str | None = None, phone: str | None = None,
                  email: str | None = None) -> Branch:
    """Create a new branch under a school"""
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise ValueError("School not found")

    branch = Branch(
        name=name,
        code=code,
        address=address,
        phone=phone,
        email=email,
        school_id=school_id,
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)

    log_audit(
        db=db,
        table_name="branches",
        record_id=branch.id,
        action="BRANCH_CREATED",
        new_data={"name": name, "code": code, "school_id": school_id},
    )

    return branch


def create_setup_admin(db: Session, school_id: str, branch_id: str,
                       full_name: str, email: str, password: str,
                       phone: str | None = None) -> User:
    """Create the first admin user during setup"""
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ValueError("Email already registered")

    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    if not admin_role:
        raise ValueError("ADMIN role not found. Run seed first.")

    admin = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=full_name,
        phone=phone,
        is_active=True,
        role_id=admin_role.id,
        school_id=school_id,
        branch_id=branch_id,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    school = db.query(School).filter(School.id == school_id).first()
    if school:
        school.owner_id = admin.id
        school.is_setup_complete = True
        db.commit()

    log_audit(
        db=db,
        table_name="users",
        record_id=admin.id,
        action="SETUP_ADMIN_CREATED",
        new_data={"email": email, "full_name": full_name, "school_id": school_id},
    )

    return admin


DEFAULT_ROLES = [
    "SUPER_ADMIN", "ADMIN", "DIRECTOR", "REGISTRAR", "TEACHER",
    "FINANCE", "HR", "INVENTORY", "LIBRARY", "CAFETERIA",
    "AUDITOR", "PARENT", "STUDENT",
]


def ensure_default_roles(db: Session) -> dict[str, str]:
    """Create all default roles if they don't exist. Returns {name: id} map."""
    result = {}
    for name in DEFAULT_ROLES:
        role = db.query(Role).filter(Role.name == name).first()
        if not role:
            role = Role(id=str(uuid.uuid4()), name=name, is_active=True)
            db.add(role)
            db.flush()
        result[name] = role.id
    db.commit()
    return result


def initialize_system(
    db: Session,
    main_key: str,
    branch_key: str,
    school_name: str,
    school_code: str,
    logo_url: str | None = None,
    country: str | None = None,
    region: str | None = None,
    city: str | None = None,
    address: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    timezone: str | None = None,
    admin_full_name: str | None = None,
    admin_email: str | None = None,
    admin_phone: str | None = None,
    admin_password: str | None = None,
) -> dict:
    """Full first-time system initialization. Creates everything."""
    existing_school = db.query(School).filter(School.is_setup_complete == True).first()
    if existing_school:
        return {"success": False, "message": "System already initialized"}

    role_ids = ensure_default_roles(db)

    school = create_school(
        db, name=school_name, code=school_code,
        logo_url=logo_url, address=address, phone=phone, email=email,
    )

    branch = create_branch(
        db, school_id=school.id, name="Main Branch",
        code=f"{school_code}-MAIN", address=address,
        phone=phone, email=email,
    )

    for key in [main_key, branch_key]:
        lic = db.query(License).filter(License.key == key).first()
        if lic:
            lic.school_id = school.id
            lic.status = LicenseStatus.ACTIVE

    if admin_full_name and admin_email and admin_password:
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        admin = User(
            id=str(uuid.uuid4()),
            email=admin_email,
            hashed_password=get_password_hash(admin_password),
            full_name=admin_full_name,
            phone=admin_phone,
            is_active=True,
            role_id=admin_role.id if admin_role else role_ids.get("ADMIN"),
            school_id=school.id,
            branch_id=branch.id,
        )
        db.add(admin)
        db.flush()
        school.owner_id = admin.id
    else:
        admin = None

    from app.services.license_crypto import bind_license_to_hardware, invalidate_license_cache
    for key in [main_key, branch_key]:
        lic = db.query(License).filter(License.key == key).first()
        if lic:
            bind_license_to_hardware(db, lic.id)
    invalidate_license_cache()

    school.is_setup_complete = True
    db.commit()
    db.refresh(school)

    return {
        "success": True,
        "school_id": school.id,
        "branch_id": branch.id,
        "admin_id": admin.id if admin else None,
        "message": "System initialized successfully",
    }


def activate_system(
    db: Session,
    main_key: str,
    school_name: str,
    school_code: str,
    admin_full_name: str,
    admin_email: str,
    admin_password: str,
    admin_phone: str | None = None,
    logo_url: str | None = None,
) -> dict:
    """First-time activation: creates school + admin, links main license (no branch)."""
    existing = db.query(School).filter(School.is_setup_complete == True).first()
    if existing:
        return {"success": False, "message": "System already activated"}

    role_ids = ensure_default_roles(db)

    school = create_school(db, name=school_name, code=school_code, logo_url=logo_url)

    lic = db.query(License).filter(License.key == main_key).first()
    if lic:
        lic.school_id = school.id
        lic.status = LicenseStatus.ACTIVE

    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    admin = User(
        id=str(uuid.uuid4()),
        email=admin_email,
        hashed_password=get_password_hash(admin_password),
        full_name=admin_full_name,
        phone=admin_phone,
        is_active=True,
        role_id=admin_role.id if admin_role else role_ids.get("ADMIN"),
        school_id=school.id,
    )
    db.add(admin)
    db.flush()
    school.owner_id = admin.id
    school.is_setup_complete = True
    db.commit()
    db.refresh(school)

    from app.services.license_crypto import bind_license_to_hardware, invalidate_license_cache
    if lic:
        bind_license_to_hardware(db, lic.id)
    invalidate_license_cache()

    return {
        "success": True,
        "school_id": school.id,
        "admin_id": admin.id,
        "message": "System activated successfully",
    }


def create_branch_with_license(
    db: Session,
    school_id: str,
    name: str,
    code: str,
    license_key: str,
    address: str | None = None,
    phone: str | None = None,
    principal: str | None = None,
) -> Branch:
    """Create a branch with branch license validation."""
    result = verify_license(db, license_key)
    if not result["valid"]:
        raise ValueError(f"Branch license invalid: {result['message']}")

    lic = db.query(License).filter(License.key == license_key).first()
    if lic and lic.school_id and lic.school_id != school_id:
        raise ValueError("Branch license already in use by another school")
    if lic and lic.branch_id:
        raise ValueError("Branch license already in use by another branch")

    branch = create_branch(
        db, school_id=school_id, name=name, code=code,
        address=address, phone=phone,
    )

    if lic:
        lic.branch_id = branch.id
        lic.school_id = school_id
        db.commit()

    return branch


def get_setup_status(db: Session, school_id: str) -> dict:
    """Get setup wizard completion status"""
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        return {
            "license_verified": False,
            "school_created": False,
            "branch_created": False,
            "admin_created": False,
            "setup_complete": False,
        }

    branch = db.query(Branch).filter(Branch.school_id == school_id).first()
    admin = db.query(User).filter(
        User.school_id == school_id,
        User.role.has(name="ADMIN"),
    ).first()

    return {
        "license_verified": True,
        "school_created": True,
        "branch_created": branch is not None,
        "admin_created": admin is not None,
        "setup_complete": school.is_setup_complete,
    }
