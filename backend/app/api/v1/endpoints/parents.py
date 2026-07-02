from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.parent import (
    ParentCreate, ParentUpdate, ParentResponse, ParentWithStudents,
    ParentSearchRequest, ParentSearchResult, LinkStudentRequest, LinkedStudent,
)
from app.services import parent_service, student_service
from app.api.v1.deps import get_current_user
from app.core.permissions import require_permission, Permission
from app.models.user import User

router = APIRouter(tags=["parents"])


@router.post("/parents", response_model=ParentResponse, status_code=status.HTTP_201_CREATED)
def create_parent(
    data: ParentCreate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.PARENT_CREATE),
):
    """Create a new parent (REGISTRAR)"""
    # Tenant scoping: body school_id honored only for SUPER_ADMIN.
    school_id = (data.school_id if current_user.is_superuser else None) or current_user.school_id
    parent = parent_service.create_parent(
        db=db,
        full_name=data.full_name,
        phone_1=data.phone_1,
        relationship=data.relationship,
        phone_2=data.phone_2,
        occupation=data.occupation,
        address=data.address,
        national_id=data.national_id,
        passport_id=data.passport_id,
        kebele_id=data.kebele_id,
        photo_url=data.photo_url,
        school_id=school_id,
    )
    return ParentResponse.model_validate(parent)


@router.post("/parents/search", response_model=list[ParentSearchResult])
def search_parents(
    data: ParentSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Smart search parents (phone, ID, name)"""
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    parents = parent_service.smart_search_parents(db, data.query, current_user.school_id, include_deleted=include_deleted)
    return [
        ParentSearchResult(
            id=p.id, full_name=p.full_name, phone_1=p.phone_1,
            relationship=p.relationship,
            match_type="smart_search",
        ) for p in parents
    ]


@router.get("/parents", response_model=list[ParentResponse])
def list_parents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(type(parent_service.Parent)).filter(
        type(parent_service.Parent).school_id == current_user.school_id,
    )
    if current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN')):
        q = q.execution_options(include_deleted=True)
    parents = q.offset(skip).limit(limit).all()
    return [ParentResponse.model_validate(p) for p in parents]


@router.get("/parents/{parent_id}", response_model=ParentWithStudents)
def get_parent(
    parent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    parent = parent_service.get_parent(db, parent_id, current_user.school_id, include_deleted=include_deleted)
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found")

    links = parent_service.get_linked_students(db, parent_id, school_id=current_user.school_id)
    linked = []
    for link in links:
        student = student_service.get_student(db, link.student_id, school_id=current_user.school_id)
        if student:
            linked.append(LinkedStudent(
                student_id=student.student_id,
                student_name=f"{student.first_name} {student.last_name}",
                grade_name=student.grade_id,
                relationship=link.relationship,
                is_primary=link.is_primary,
            ))

    result = ParentWithStudents.model_validate(parent)
    result.linked_students = linked
    return result


@router.patch("/parents/{parent_id}", response_model=ParentResponse)
def update_parent(
    parent_id: str,
    data: ParentUpdate,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.PARENT_CREATE),
):
    parent = parent_service.update_parent(db, parent_id, data.model_dump(exclude_none=True), current_user.school_id, include_deleted=True)
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found")
    return ParentResponse.model_validate(parent)


@router.post("/parents/{parent_id}/link")
def link_parent(
    parent_id: str,
    data: LinkStudentRequest,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.PARENT_CREATE),
):
    """Link parent to a student"""
    parent = parent_service.get_parent(db, parent_id, current_user.school_id, include_deleted=True)
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found")

    student = student_service.get_student(db, data.student_id, current_user.school_id, include_deleted=True)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    link = parent_service.link_parent_to_student(
        db, parent_id, data.student_id, data.relationship, data.is_primary, current_user.school_id, user_id=current_user.id,
    )
    return {"message": "Parent linked to student", "parent_id": parent_id, "student_id": data.student_id}


@router.delete("/parents/{parent_id}/unlink")
def unlink_parent(
    parent_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.PARENT_CREATE),
):
    unlinked = parent_service.unlink_parent_from_student(db, parent_id, student_id, current_user.school_id, user_id=current_user.id)
    if not unlinked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    return {"message": "Parent unlinked from student"}


@router.delete("/parents/{parent_id}")
def delete_parent(
    parent_id: str,
    db: Session = Depends(get_db),
    current_user: User = require_permission(Permission.PARENT_CREATE),
):
    deleted = parent_service.delete_parent(db, parent_id, current_user.school_id, include_deleted=True)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found")
    return {"message": "Parent deleted successfully"}


@router.get("/parents/{parent_id}/id-card")
def get_parent_id_card(
    parent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi.responses import HTMLResponse
    from html import escape as _e
    parent = parent_service.get_parent(db, parent_id, current_user.school_id, include_deleted=True)
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found")
    links = parent_service.get_linked_students(db, parent_id, school_id=current_user.school_id)
    linked_names = []
    for link in links:
        from app.services import student_service
        student = student_service.get_student(db, link.student_id, school_id=current_user.school_id, include_deleted=True)
        if student:
            linked_names.append(f"{student.first_name} {student.last_name}")
    # All user-controlled strings are HTML-escaped to prevent stored XSS
    # (parent names / phone / student names are entered by registrars/parents).
    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Parent ID Card</title>
<style>
  body {{ font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }}
  .card {{ width: 340px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; }}
  .header {{ background: linear-gradient(135deg, #1a73e8, #0d47a1); color: #fff; padding: 20px 16px; text-align: center; }}
  .header h2 {{ margin: 0; font-size: 18px; }} .header p {{ margin: 4px 0 0; font-size: 12px; opacity: 0.9; }}
  .body {{ padding: 16px; }}
  .field {{ margin-bottom: 10px; }}
  .field label {{ font-size: 10px; color: #888; text-transform: uppercase; display: block; }}
  .field span {{ font-size: 14px; font-weight: 500; }}
  .students {{ margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; }}
  .students h4 {{ margin: 0 0 6px; font-size: 11px; color: #888; text-transform: uppercase; }}
  .students ul {{ margin: 0; padding-left: 16px; font-size: 13px; }}
  .footer {{ background: #f8f9fa; padding: 10px 16px; text-align: center; font-size: 10px; color: #999; }}
</style></head><body>
<div class="card">
  <div class="header"><h2>ZENOVA</h2><p>Parent Identification Card</p></div>
    <div class="body">
    <div class="field"><label>Full Name</label><span>{_e(parent.full_name or "")}</span></div>
    <div class="field"><label>Phone</label><span>{_e(parent.phone_1 or "")}</span></div>
    <div class="field"><label>ID</label><span>{_e(parent.parent_id or parent.id or "")}</span></div>
    <div class="students">
      <h4>Linked Students ({len(linked_names)})</h4>
      <ul>{"".join(f'<li>{_e(n)}</li>' for n in linked_names)}</ul>
    </div>
  </div>
  <div class="footer"><span>Valid for {_e(current_user.school_id or "")} | {datetime.now().strftime("%Y")}</span></div>
</div>
</body></html>"""
    return HTMLResponse(content=html)
