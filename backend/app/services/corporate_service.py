import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from app.models.corporate_department import CorporateDepartment
from app.models.corporate_employee import CorporateEmployee
from app.core.audit import log_audit
from app.core.exceptions import ConflictException
from app.core.error_codes import ErrorCode


def create_department(
    db: Session,
    name: str,
    code: str,
    description: str | None = None,
    user_id: str | None = None,
) -> CorporateDepartment:
    existing = db.query(CorporateDepartment).filter(
        (CorporateDepartment.name == name) | (CorporateDepartment.code == code)
    ).first()
    if existing:
        raise ConflictException("Department name or code already exists", code=ErrorCode.CONFLICT_GENERIC)
    dept = CorporateDepartment(name=name, code=code, description=description)
    db.add(dept)
    log_audit(
        db=db, user_id=user_id or "system",
        table_name="corporate_departments", record_id=dept.id,
        action="CORPORATE_DEPARTMENT_CREATED",
        new_data={"name": name, "code": code},
    )
    db.commit()
    db.refresh(dept)
    return dept


def update_department(
    db: Session,
    dept_id: str,
    data: dict,
    user_id: str | None = None,
) -> CorporateDepartment | None:
    dept = db.query(CorporateDepartment).filter(
        CorporateDepartment.id == dept_id, CorporateDepartment.deleted_at.is_(None)
    ).first()
    if not dept:
        return None
    for key, val in data.items():
        if val is not None and hasattr(dept, key):
            setattr(dept, key, val)
    dept.updated_at = datetime.now(timezone.utc)
    log_audit(
        db=db, user_id=user_id or "system",
        table_name="corporate_departments", record_id=dept.id,
        action="CORPORATE_DEPARTMENT_UPDATED",
        new_data=data,
    )
    db.commit()
    db.refresh(dept)
    return dept


def list_departments(db: Session, active_only: bool = True) -> list[CorporateDepartment]:
    q = db.query(CorporateDepartment).filter(CorporateDepartment.deleted_at.is_(None))
    if active_only:
        q = q.filter(CorporateDepartment.is_active.is_(True))
    return q.order_by(CorporateDepartment.name).all()


def create_employee(
    db: Session,
    full_name: str,
    email: str,
    user_id: str,
    phone: str | None = None,
    department_id: str | None = None,
    position: str | None = None,
    photo_url: str | None = None,
    employment_date: datetime | None = None,
    employment_type: str = "full-time",
    created_by: str | None = None,
) -> CorporateEmployee:
    emp_id = _generate_employee_id(db)

    emp = CorporateEmployee(
        employee_id=emp_id,
        user_id=user_id,
        full_name=full_name,
        email=email,
        phone=phone,
        department_id=department_id,
        position=position,
        photo_url=photo_url,
        employment_date=employment_date,
        employment_type=employment_type,
        created_by=created_by,
    )
    db.add(emp)
    log_audit(
        db=db, user_id=created_by or "system",
        table_name="corporate_employees", record_id=emp.id,
        action="CORPORATE_EMPLOYEE_CREATED",
        new_data={"employee_id": emp_id, "full_name": full_name, "email": email},
    )
    db.commit()
    db.refresh(emp)
    return emp


def update_employee(
    db: Session,
    emp_id: str,
    data: dict,
    user_id: str | None = None,
) -> CorporateEmployee | None:
    emp = db.query(CorporateEmployee).filter(
        CorporateEmployee.id == emp_id, CorporateEmployee.deleted_at.is_(None)
    ).first()
    if not emp:
        return None
    for key, val in data.items():
        if val is not None and hasattr(emp, key):
            setattr(emp, key, val)
    emp.updated_at = datetime.now(timezone.utc)
    log_audit(
        db=db, user_id=user_id or "system",
        table_name="corporate_employees", record_id=emp.id,
        action="CORPORATE_EMPLOYEE_UPDATED",
        new_data=data,
    )
    db.commit()
    db.refresh(emp)
    return emp


def get_employee(db: Session, emp_id: str) -> CorporateEmployee | None:
    return db.query(CorporateEmployee).filter(
        CorporateEmployee.id == emp_id, CorporateEmployee.deleted_at.is_(None)
    ).first()


def get_employee_by_user_id(db: Session, user_id: str) -> CorporateEmployee | None:
    return db.query(CorporateEmployee).filter(
        CorporateEmployee.user_id == user_id, CorporateEmployee.deleted_at.is_(None)
    ).first()


def list_employees(
    db: Session,
    department_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[CorporateEmployee]:
    q = db.query(CorporateEmployee).options(joinedload(CorporateEmployee.department))
    q = q.filter(CorporateEmployee.deleted_at.is_(None))
    if department_id:
        q = q.filter(CorporateEmployee.department_id == department_id)
    if status:
        q = q.filter(CorporateEmployee.status == status)
    return q.order_by(CorporateEmployee.full_name).offset(offset).limit(limit).all()


def delete_employee(db: Session, emp_id: str, user_id: str | None = None) -> bool:
    emp = db.query(CorporateEmployee).filter(
        CorporateEmployee.id == emp_id, CorporateEmployee.deleted_at.is_(None)
    ).first()
    if not emp:
        return False
    emp.deleted_at = datetime.now(timezone.utc)
    log_audit(
        db=db, user_id=user_id or "system",
        table_name="corporate_employees", record_id=emp.id,
        action="CORPORATE_EMPLOYEE_DELETED",
    )
    db.commit()
    return True


def get_dashboard(db: Session) -> dict:
    total = db.query(CorporateEmployee).filter(CorporateEmployee.deleted_at.is_(None)).count()
    active = db.query(CorporateEmployee).filter(
        CorporateEmployee.deleted_at.is_(None), CorporateEmployee.status == "active"
    ).count()
    dept_count = db.query(CorporateDepartment).filter(
        CorporateDepartment.deleted_at.is_(None), CorporateDepartment.is_active.is_(True)
    ).count()
    from sqlalchemy import func
    by_dept = (
        db.query(
            CorporateDepartment.name,
            func.count(CorporateEmployee.id).label("count"),
        )
        .outerjoin(CorporateEmployee, CorporateEmployee.department_id == CorporateDepartment.id)
        .filter(CorporateDepartment.deleted_at.is_(None))
        .group_by(CorporateDepartment.name)
        .all()
    )
    return {
        "total_employees": total,
        "active_employees": active,
        "department_count": dept_count,
        "employees_by_department": [{"department": d.name, "count": d.count} for d in by_dept],
    }


def _generate_employee_id(db: Session) -> str:
    from sqlalchemy import func
    prefix = "ZNV-EMP-"
    max_id = db.query(func.max(CorporateEmployee.employee_id)).scalar()
    if max_id and max_id.startswith(prefix):
        next_num = int(max_id.split("-")[-1]) + 1
    else:
        next_num = 1
    return f"{prefix}{next_num:06d}"
