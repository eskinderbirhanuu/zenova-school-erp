from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.license import BranchWithLicenseRequest, BranchUpdateRequest, BranchResponse
from app.services import license_service
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.branch import Branch
from app.core.audit import log_audit

router = APIRouter(tags=["branches"])


@router.get("/branches")
def list_branches(
    school_id: str = Query(None),
    search: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Branch).filter(Branch.deleted_at.is_(None))
    if current_user.is_superuser and school_id:
        q = q.filter(Branch.school_id == school_id)
    elif not current_user.is_superuser:
        q = q.filter(Branch.school_id == current_user.school_id)
    if search:
        s = f"%{search}%"
        q = q.filter(Branch.name.ilike(s) | Branch.code.ilike(s))
    branches = q.order_by(Branch.created_at.desc()).all()
    return [
        {
            "id": b.id, "name": b.name, "code": b.code,
            "address": b.address, "phone": b.phone, "email": b.email,
            "school_id": b.school_id, "is_active": b.is_active,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in branches
    ]


@router.post("/branches", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def create_branch(
    data: BranchWithLicenseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a branch with branch license validation (requires auth)"""
    if not current_user.school_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User has no school")

    try:
        branch = license_service.create_branch_with_license(
            db,
            school_id=current_user.school_id,
            name=data.name,
            code=data.code,
            license_key=data.license_key,
            address=data.address,
            phone=data.phone,
            principal=data.principal,
        )
        return BranchResponse.model_validate(branch)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/branches/{branch_id}", response_model=BranchResponse)
def get_branch(
    branch_id: str,
    db: Session = Depends(get_db),
):
    branch = db.query(Branch).filter(Branch.id == branch_id, Branch.deleted_at.is_(None)).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    return BranchResponse.model_validate(branch)


@router.patch("/branches/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: str,
    data: BranchUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    branch = db.query(Branch).filter(Branch.id == branch_id, Branch.deleted_at.is_(None)).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    if data.name is not None:
        branch.name = data.name
    if data.code is not None:
        branch.code = data.code
    if data.address is not None:
        branch.address = data.address
    if data.phone is not None:
        branch.phone = data.phone
    if data.email is not None:
        branch.email = data.email
    if data.is_active is not None:
        branch.is_active = data.is_active
    db.commit()
    db.refresh(branch)
    log_audit(db, current_user.id, "BRANCH_UPDATED", "branch", branch_id, f"Branch '{branch.name}' updated")
    return BranchResponse.model_validate(branch)


@router.delete("/branches/{branch_id}")
def delete_branch(
    branch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    branch = db.query(Branch).filter(Branch.id == branch_id, Branch.deleted_at.is_(None)).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    branch.deleted_at = db.query(Branch).filter(Branch.id == branch_id).first().created_at.__class__()
    from datetime import datetime
    branch.deleted_at = datetime.utcnow()
    db.commit()
    log_audit(db, current_user.id, "BRANCH_DELETED", "branch", branch_id, f"Branch '{branch.name}' deleted")
    return {"message": "Branch deleted successfully"}
