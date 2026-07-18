"""Multi-Role Assignment Management API.

Provides CRUD for user-role assignments and role switching.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import (
    require_permission, Permission,
    get_role_permissions, ROLE_PERMISSIONS,
)
from app.core.exceptions import NotFoundException, ConflictException, BadRequestException
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.role_permission import RolePermission
from app.services import auth_service

router = APIRouter()


# ─── GET /roles — list all roles ───────────────────────────────────
@router.get("/roles", response_model=list[dict])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    roles = db.query(Role).filter(Role.deleted_at.is_(None)).order_by(Role.name).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "level": r.level,
            "is_active": r.is_active,
            "school_id": r.school_id,
            "permissions": get_role_permissions(r.name),
        }
        for r in roles
    ]


# ─── GET /users/{user_id}/roles — list user's roles ────────────────
@router.get("/users/{user_id}/roles", response_model=list[dict])
def list_user_roles(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise NotFoundException("User not found")

    assignments = db.query(UserRole).filter(
        UserRole.user_id == user_id,
        UserRole.deleted_at.is_(None),
        UserRole.revoked_at.is_(None),
    ).all()

    result = []
    for ur in assignments:
        role = db.query(Role).filter(Role.id == ur.role_id).first()
        if role:
            result.append({
                "id": ur.id,
                "role_id": role.id,
                "role_name": role.name,
                "assigned_at": ur.assigned_at.isoformat() if ur.assigned_at else None,
                "reason": ur.reason,
            })
    return result


# ─── POST /users/{user_id}/roles — assign a role to user ──────────
@router.post("/users/{user_id}/roles", status_code=status.HTTP_201_CREATED)
def assign_role(
    user_id: str,
    role_id: str = Query(..., description="Role ID to assign"),
    reason: str = Query("", max_length=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise NotFoundException("User not found")

    role = db.query(Role).filter(Role.id == role_id, Role.deleted_at.is_(None)).first()
    if not role:
        raise NotFoundException("Role not found")

    existing = db.query(UserRole).filter(
        UserRole.user_id == user_id,
        UserRole.role_id == role_id,
        UserRole.deleted_at.is_(None),
        UserRole.revoked_at.is_(None),
    ).first()
    if existing:
        raise ConflictException("User already has this role assigned")

    assignment = UserRole(
        id=str(uuid.uuid4()),
        user_id=user_id,
        role_id=role_id,
        assigned_by=current_user.id,
        assigned_at=datetime.now(timezone.utc),
        reason=reason or None,
    )
    db.add(assignment)

    from app.core.audit import log_audit
    log_audit(
        db=db,
        user_id=current_user.id,
        table_name="user_roles",
        record_id=assignment.id,
        action="ROLE_ASSIGNED",
        new_data={
            "user_id": user_id,
            "user_email": user.email,
            "role_name": role.name,
            "reason": reason,
        },
        school_id=user.school_id or current_user.school_id,
    )
    db.commit()

    return {
        "id": assignment.id,
        "user_id": user_id,
        "role_id": role_id,
        "role_name": role.name,
        "assigned_at": assignment.assigned_at.isoformat(),
        "message": f"Role '{role.name}' assigned to user '{user.full_name}'",
    }


# ─── DELETE /users/{user_id}/roles/{role_id} — remove role ────────
@router.delete("/users/{user_id}/roles/{role_id}")
def revoke_role(
    user_id: str,
    role_id: str,
    reason: str = Query("", max_length=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = db.query(UserRole).filter(
        UserRole.user_id == user_id,
        UserRole.role_id == role_id,
        UserRole.deleted_at.is_(None),
        UserRole.revoked_at.is_(None),
    ).first()
    if not assignment:
        raise NotFoundException("Role assignment not found")

    assignment.revoked_at = datetime.now(timezone.utc)
    assignment.deleted_at = datetime.now(timezone.utc)
    assignment.reason = reason or assignment.reason

    role = db.query(Role).filter(Role.id == role_id).first()
    user = db.query(User).filter(User.id == user_id).first()

    from app.core.audit import log_audit
    log_audit(
        db=db,
        user_id=current_user.id,
        table_name="user_roles",
        record_id=assignment.id,
        action="ROLE_REVOKED",
        old_data={"user_id": user_id, "role_name": role.name if role else role_id},
        new_data={"reason": reason},
        school_id=user.school_id if user else current_user.school_id,
    )
    db.commit()

    return {"message": f"Role revoked from user"}


# ─── POST /auth/switch-role — switch active role (frontend) ────────
@router.post("/auth/switch-role")
def switch_active_role(
    role_name: str = Query(..., description="Role to switch to"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_roles = current_user.get_role_names()
    if role_name not in user_roles:
        raise BadRequestException(f"You do not have the '{role_name}' role")

    return {
        "role_name": role_name,
        "roles": user_roles,
        "permissions": sorted(get_role_permissions(role_name)),
    }


# ─── GET /users/{user_id}/permissions — get user's effective permissions ──
@router.get("/users/{user_id}/permissions", response_model=dict)
def get_user_effective_permissions(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.core.permissions import get_user_permissions

    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise NotFoundException("User not found")

    perms = get_user_permissions(user)
    return {
        "user_id": user_id,
        "email": user.email,
        "roles": user.get_role_names(),
        "permissions": sorted(perms),
    }


# ─── GET /roles/{role_id}/permissions — get role permissions ──────────
@router.get("/roles/{role_id}/permissions")
def get_role_permissions_endpoint(
    role_id: str,
    db: Session = Depends(get_db),
):
    role = db.query(Role).filter(Role.id == role_id, Role.deleted_at.is_(None)).first()
    if not role:
        raise NotFoundException("Role not found")

    return {
        "role_id": role_id,
        "role_name": role.name,
        "permissions": get_role_permissions(role.name),
    }
