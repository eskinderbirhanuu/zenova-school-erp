"""Seed initial roles and super admin for ZENOVA.

Usage:
    python -m scripts.seed_initial

This script:
1. Creates all 13 roles if they don't exist
2. Creates SUPER_ADMIN user if none exists
3. Creates a default school and branch if none exist
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.role import Role
from app.models.school import School
from app.models.branch import Branch
from app.config import settings


ROLES = [
    {"name": "SUPER_ADMIN", "level": "100", "description": "Full system access across all schools"},
    {"name": "ADMIN", "level": "80", "description": "School owner with full school access"},
    {"name": "DIRECTOR", "level": "60", "description": "Staff management and academic oversight"},
    {"name": "REGISTRAR", "level": "50", "description": "Student admissions and records"},
    {"name": "TEACHER", "level": "45", "description": "Classroom teaching, attendance, grades"},
    {"name": "FINANCE", "level": "50", "description": "Accounting, billing, payroll"},
    {"name": "HR", "level": "50", "description": "Staff management, leave, contracts"},
    {"name": "INVENTORY", "level": "50", "description": "Asset and stock management"},
    {"name": "LIBRARY", "level": "50", "description": "Book management, borrowing, fines"},
    {"name": "CAFETERIA", "level": "50", "description": "POS operations and product management"},
    {"name": "AUDITOR", "level": "40", "description": "Read-only inspection across all modules"},
    {"name": "PARENT", "level": "20", "description": "Parent portal (cloud only)"},
    {"name": "STUDENT", "level": "10", "description": "Student portal (cloud only)"},
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        for role_data in ROLES:
            existing = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not existing:
                role = Role(**role_data)
                db.add(role)
                print(f"Created role: {role_data['name']}")
            else:
                print(f"Role already exists: {role_data['name']}")

        db.commit()

        existing_super = db.query(User).filter(User.is_superuser == True).first()
        if not existing_super:
            super_role = db.query(Role).filter(Role.name == "SUPER_ADMIN").first()
            super_admin = User(
                email="super@zenova.app",
                hashed_password=get_password_hash("admin123"),
                full_name="ZENOVA Super Admin",
                is_superuser=True,
                is_active=True,
                role_id=super_role.id if super_role else None,
            )
            db.add(super_admin)
            db.commit()
            print("Created SUPER_ADMIN user: super@zenova.app / admin123")
        else:
            print(f"SUPER_ADMIN already exists: {existing_super.email}")

        default_school = db.query(School).filter(School.code == "DEFAULT").first()
        if not default_school:
            school = School(
                name="Default School",
                code="DEFAULT",
                address="Default Address",
            )
            db.add(school)
            db.commit()
            db.refresh(school)
            print(f"Created default school: {school.name}")

            branch = Branch(
                name="Main Branch",
                code="MAIN",
                school_id=school.id,
                address="Default Address",
            )
            db.add(branch)
            db.commit()
            print(f"Created default branch: {branch.name}")
        else:
            print("Default school already exists")

        print("\nSeed completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
