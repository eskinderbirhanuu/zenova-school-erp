import uuid
import secrets
import sys
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.role import Role
from app.models.license import License, LicenseType, LicenseStatus

SUPER_ADMIN_PHONE = "0901482324"
SUPER_ADMIN_EMAIL = "eskinderbirhanuu@gmail.com"


def seed():
    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.is_superuser == True).first()
        if existing:
            print("Super Admin already exists. Skipping seed.")
            return

        role = db.query(Role).filter(Role.name == "SUPER_ADMIN").first()
        if not role:
            role = Role(id=str(uuid.uuid4()), name="SUPER_ADMIN")
            db.add(role)
            db.flush()

        employee_id = "SUPER001"
        hashed_pw = get_password_hash("Zenova@2026Admin!")
        super_admin = User(
            id=str(uuid.uuid4()),
            email=SUPER_ADMIN_EMAIL,
            employee_id=employee_id,
            hashed_password=hashed_pw,
            full_name="Eskinder Birhanu",
            phone=SUPER_ADMIN_PHONE,
            role_id=role.id,
            is_superuser=True,
            is_active=True,
        )
        db.add(super_admin)
        db.flush()

        demo_license_key = f"ZNV-DEMO-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
        demo_license = License(
            id=str(uuid.uuid4()),
            key=demo_license_key,
            license_type=LicenseType.MAIN,
            status=LicenseStatus.ACTIVE,
            valid_from=datetime.now(timezone.utc),
            valid_until=datetime.now(timezone.utc) + timedelta(days=365),
            max_users="Unlimited",
        )
        db.add(demo_license)
        db.commit()

        print("=" * 50)
        print("  ZENOVA Super Admin Created!")
        print("=" * 50)
        print(f"  Employee ID  : {employee_id}")
        print(f"  Password     : Zenova@2026Admin!")
        print(f"  Email        : {SUPER_ADMIN_EMAIL}")
        print(f"  Phone        : {SUPER_ADMIN_PHONE}")
        print("─" * 50)
        print(f"  Demo License : {demo_license_key}")
        print(f"  Expires      : {(datetime.now(timezone.utc) + timedelta(days=365)).strftime('%Y-%m-%d')}")
        print("=" * 50)
        print("  Login at: http://<server-ip>/login")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
