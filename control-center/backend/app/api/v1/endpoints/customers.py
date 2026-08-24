from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import verify_token
from app.database import get_db
from app.models.customer import Customer
from app.models.license import License, LicenseType, LicenseStatus
from app.schemas.customer import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
    SchoolCreateWithLicense,
    SchoolCreateWithLicenseResponse,
)
from app.api.v1.endpoints.licenses import generate_secure_license_key

router = APIRouter()


@router.get("", response_model=CustomerListResponse)
def list_customers(search: str = "", skip: int = 0, limit: int = 50, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    query = db.query(Customer)
    if search:
        query = query.filter(Customer.name.ilike(f"%{search}%") | Customer.domain.ilike(f"%{search}%"))
    total = query.count()
    items = query.order_by(Customer.created_at.desc()).offset(skip).limit(limit).all()
    return CustomerListResponse(total=total, items=items)


@router.post("", response_model=CustomerResponse)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    existing = db.query(Customer).filter(Customer.domain == data.domain).first()
    if existing:
        raise HTTPException(status_code=400, detail="Domain already registered")
    if data.school_code:
        existing_code = db.query(Customer).filter(Customer.school_code == data.school_code).first()
        if existing_code:
            raise HTTPException(status_code=400, detail="School code already registered")
    customer = Customer(**data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.post("/school-with-license", response_model=SchoolCreateWithLicenseResponse)
def create_school_with_license(data: SchoolCreateWithLicense, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    """Create a school and generate a license in a single atomic operation."""
    # Check domain uniqueness
    existing = db.query(Customer).filter(Customer.domain == data.domain).first()
    if existing:
        raise HTTPException(status_code=400, detail="Domain already registered")
    
    # Check school code uniqueness
    if data.school_code:
        existing_code = db.query(Customer).filter(Customer.school_code == data.school_code).first()
        if existing_code:
            raise HTTPException(status_code=400, detail="School code already registered")
    
    # Create the school
    school_data = data.model_dump(exclude={"license_type", "plan", "seats", "expires_at", "notes"})
    school = Customer(**school_data)
    db.add(school)
    db.flush()
    
    # Generate license key
    license_key = generate_secure_license_key()
    
    # Create license
    license_type_enum = LicenseType(data.license_type) if data.license_type in [e.value for e in __import__('app.models.license', fromlist=['LicenseType']).LicenseType.__members__] else LicenseType.MAIN
    
    lic = License(
        customer_id=school.id,
        license_key=generate_secure_license_key(),
        license_type=license_type_enum,
        plan=data.plan,
        seats=data.seats,
        expires_at=datetime.fromisoformat(data.expires_at.replace("Z", "+00:00")),
        notes=data.notes,
        status=LicenseStatus.PENDING,
    )
    db.add(lic)
    db.commit()
    db.refresh(school)
    db.refresh(lic)
    
    return SchoolCreateWithLicenseResponse(
        customer=school,
        license_key=lic.license_key,
        license={
            "id": lic.id,
            "license_key": lic.license_key,
            "license_type": lic.license_type.value,
            "status": lic.status.value,
            "plan": lic.plan,
            "seats": lic.seats,
            "expires_at": lic.expires_at.isoformat(),
            "issued_at": lic.issued_at.isoformat(),
        }
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, data: CustomerUpdate, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(customer, key, val)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db), _admin: dict = Depends(verify_token)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return {"ok": True}