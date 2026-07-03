"""Admin dashboard endpoints."""
from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import School, SchoolLicense, LicenseStatus
from app.services.school_service import get_school_stats, count_schools

router = APIRouter()


@router.get("/dashboard")
def admin_dashboard(db: Session = Depends(get_db)):
    stats = get_school_stats(db)

    # License stats
    license_stats = Counter()
    for lic in db.query(SchoolLicense).all():
        license_stats[lic.status] += 1

    return {
        "schools": stats,
        "licenses": dict(license_stats),
        "total_licenses": sum(license_stats.values()),
    }


@router.get("/schools")
def admin_schools(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    from app.services.school_service import list_schools, count_schools
    schools = list_schools(db, skip, limit)
    total = count_schools(db)
    return {
        "schools": [
            {
                "id": s.id,
                "name": s.name,
                "email": s.email,
                "tier": s.tier,
                "is_active": s.is_active,
                "registered_at": s.registered_at.isoformat(),
                "last_sync_at": s.last_sync_at.isoformat() if s.last_sync_at else None,
            }
            for s in schools
        ],
        "total": total,
    }
