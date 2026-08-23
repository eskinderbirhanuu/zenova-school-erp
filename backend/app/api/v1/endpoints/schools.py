from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.core.permissions import require_permission, Permission
from app.models.user import User
from app.models.school import School
from app.models.branch import Branch
from app.models.heartbeat import SchoolHeartbeat
from app.models.license import License, LicenseStatus
from datetime import datetime, timezone, timedelta

router = APIRouter(tags=["schools"])


class SchoolUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None


def _school_to_dict(school: School, branch_count: int, last_heartbeat: dict | None = None) -> dict:
    base = {
        "id": school.id,
        "name": school.name,
        "code": school.code,
        "address": school.address,
        "phone": school.phone,
        "email": school.email,
        "website": school.website,
        "logo_url": school.logo_url,
        "is_active": school.is_active,
        "is_setup_complete": school.is_setup_complete,
        "branch_count": branch_count,
        "created_at": school.created_at.isoformat() if school.created_at else None,
    }
    if last_heartbeat:
        received_at = last_heartbeat.get("received_at")
        if isinstance(received_at, str):
            received_at = datetime.fromisoformat(received_at.replace("Z", "+00:00"))
        elif isinstance(received_at, datetime):
            pass
        now = datetime.now(timezone.utc)
        offline_for = None
        if received_at:
            offline_for = int((now - received_at).total_seconds() / 3600)
        base.update({
            "last_seen": received_at.isoformat() if received_at else None,
            "last_version": last_heartbeat.get("version"),
            "last_server_role": last_heartbeat.get("server_role"),
            "online": offline_for is not None and offline_for <= 2,  # online if heartbeat within 2 intervals
            "offline_for_hours": offline_for,
            "license_key": last_heartbeat.get("license_key"),
        })
    else:
        base.update({
            "last_seen": None,
            "last_version": None,
            "last_server_role": None,
            "online": False,
            "offline_for_hours": None,
            "license_key": None,
        })
    return base


@router.get("/schools/overview")
def schools_overview(
    search: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin only")
    q = db.query(School).execution_options(include_deleted=True)
    if search:
        s = f"%{search}%"
        q = q.filter(School.name.ilike(s) | School.code.ilike(s))
    total = q.count()
    schools = q.order_by(School.created_at.desc()).offset(skip).limit(limit).all()

    school_ids = [s.id for s in schools]

    # Batch-load branch counts
    branch_counts = db.query(Branch.school_id, func.count(Branch.id)).filter(
        Branch.school_id.in_(school_ids)
    ).group_by(Branch.school_id).all() if school_ids else []
    branch_count_map = {sid: count for sid, count in branch_counts}

    # Batch-load latest heartbeats per school_code
    school_codes = [s.code for s in schools]
    heartbeats = {}
    if school_codes:
        latest_hbs = db.query(SchoolHeartbeat).filter(
            SchoolHeartbeat.school_code.in_(school_codes)
        ).order_by(SchoolHeartbeat.received_at.desc()).all()
        for hb in latest_hbs:
            if hb.school_code not in heartbeats:
                heartbeats[hb.school_code] = {
                    "received_at": hb.received_at,
                    "version": hb.version,
                    "server_role": hb.server_role,
                    "license_key": hb.license_key,
                }

    # Batch-load license status per school (latest license)
    licenses = {}
    if school_ids:
        latest_licenses = db.query(License).filter(
            License.school_id.in_(school_ids),
            License.deleted_at.is_(None)
        ).order_by(License.created_at.desc()).all()
        for lic in latest_licenses:
            if lic.school_id not in licenses:
                licenses[lic.school_id] = {
                    "status": lic.status.value if lic.status else None,
                    "license_type": lic.license_type.value if lic.license_type else None,
                    "valid_until": lic.valid_until.isoformat() if lic.valid_until else None,
                    "max_users": lic.max_users,
                }

    result = []
    for school in schools:
        branch_count = branch_count_map.get(school.id, 0)
        hb = heartbeats.get(school.code)
        lic = licenses.get(school.id)
        school_dict = _school_to_dict(school, branch_count, hb)
        if lic:
            school_dict.update({
                "license_status": lic["status"],
                "license_type": lic["license_type"],
                "license_valid_until": lic["valid_until"],
                "license_max_users": lic["max_users"],
            })
        result.append(school_dict)
    return {"schools": result, "total": total}


@router.get("/schools/me")
def get_my_school(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    school = db.query(School).filter(School.id == current_user.school_id).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")
    branch_count = db.query(Branch).filter(Branch.school_id == school.id).count()
    return _school_to_dict(school, branch_count)


@router.patch("/schools/me")
def update_my_school(
    data: SchoolUpdate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.SETTINGS_MANAGE),
):
    school = db.query(School).filter(School.id == current_user.school_id).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")
    if data.name is not None:
        school.name = data.name
    if data.address is not None:
        school.address = data.address
    if data.phone is not None:
        school.phone = data.phone
    if data.email is not None:
        school.email = data.email
    db.commit()
    db.refresh(school)
    branch_count = db.query(Branch).filter(Branch.school_id == school.id).count()
    return _school_to_dict(school, branch_count)


@router.get("/schools")
def list_schools(
    search: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin only")
    q = db.query(School).execution_options(include_deleted=True)
    if search:
        s = f"%{search}%"
        q = q.filter(School.name.ilike(s) | School.code.ilike(s))
    total = q.count()
    schools = q.order_by(School.created_at.desc()).offset(skip).limit(limit).all()

    # Batch-load branch counts to avoid N+1 queries
    school_ids = [s.id for s in schools]
    branch_counts = db.query(Branch.school_id, func.count(Branch.id)).filter(
        Branch.school_id.in_(school_ids)
    ).group_by(Branch.school_id).all() if school_ids else []
    branch_count_map = {sid: count for sid, count in branch_counts}

    result = []
    for school in schools:
        branch_count = branch_count_map.get(school.id, 0)
        result.append(_school_to_dict(school, branch_count))
    return {"schools": result, "total": total}


@router.get("/schools/{school_id}")
def get_school(
    school_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin only")
    school = db.query(School).filter(School.id == school_id).execution_options(include_deleted=True).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")
    branch_count = db.query(Branch).filter(Branch.school_id == school.id).execution_options(include_deleted=True).count()
    return _school_to_dict(school, branch_count)
