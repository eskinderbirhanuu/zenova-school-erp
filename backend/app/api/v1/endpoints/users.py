from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_role
from app.schemas.user import UserResponse, UserUpdate, RoleResponse
from app.models.user import User
from app.models.role import Role

router = APIRouter()
ADMIN = [require_role("ADMIN", "SUPER_ADMIN")]
VIEW_USERS = [require_role("ADMIN", "SUPER_ADMIN", "DIRECTOR")]


@router.get("/users", response_model=list[UserResponse], dependencies=VIEW_USERS)
def list_users(
    role: str = Query(None),
    search: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(User).execution_options(include_deleted=True)
    if not current_user.is_superuser:
        q = q.filter(User.school_id == current_user.school_id)
    if role:
        q = q.join(Role).filter(Role.name == role.upper())
    if search:
        s = f"%{search}%"
        q = q.filter(User.full_name.ilike(s) | User.email.ilike(s))
    q = q.order_by(User.created_at.desc()).offset(skip).limit(limit)
    users = q.all()
    result = []
    for u in users:
        r = UserResponse(
            id=u.id, email=u.email, full_name=u.full_name, phone=u.phone,
            is_active=u.is_active, is_superuser=u.is_superuser, is_view_only=u.is_view_only,
            role_name=u.role.name if u.role else None,
            school_id=u.school_id, branch_id=u.branch_id,
            created_at=u.created_at, last_login_at=u.last_login_at,
        )
        result.append(r)
    return result


@router.patch("/users/{user_id}", response_model=UserResponse, dependencies=ADMIN)
def update_user(
    user_id: str,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    u = db.query(User).filter(User.id == user_id).execution_options(include_deleted=True).first()
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not current_user.is_superuser and u.school_id != current_user.school_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot manage users outside your school")
    update_data = data.model_dump(exclude_none=True)
    for key, val in update_data.items():
        setattr(u, key, val)
    db.commit()
    db.refresh(u)
    return UserResponse(
        id=u.id, email=u.email, full_name=u.full_name, phone=u.phone,
        is_active=u.is_active, is_superuser=u.is_superuser, is_view_only=u.is_view_only,
        role_name=u.role.name if u.role else None,
        school_id=u.school_id, branch_id=u.branch_id,
        created_at=u.created_at, last_login_at=u.last_login_at,
    )


@router.get("/roles", response_model=list[RoleResponse], dependencies=VIEW_USERS)
def list_roles(db: Session = Depends(get_db)):
    roles = db.query(Role).filter(Role.is_active == True).order_by(Role.name).all()
    return [RoleResponse(id=r.id, name=r.name, level=r.level, description=r.description, is_active=r.is_active) for r in roles]
