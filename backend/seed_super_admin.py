"""Seed script: Create super admin user + SAL license + ServerIdentity for testing.

Usage:
    python seed_super_admin.py

Requires:
    - Database running and migrated
    - .env file with MASTER_SETUP_KEY and SUPER_ADMIN_EMAIL
"""
import uuid
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("ENVIRONMENT", "development")

from app.database import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.license import License, LicenseType, LicenseStatus
from app.models.server import ServerIdentity, ServerRole
from app.core.security import get_password_hash
from app.core import server_identity
from app.config import settings

SAL_LICENSE_KEY = os.environ.get("SAL_LICENSE_KEY", "SAL-ABCD-1234-5678")


def seed():
    db = SessionLocal()

    # 1. Ensure roles exist
    from app.services.license_service import ensure_default_roles
    role_ids = ensure_default_roles(db)
    print(f"Roles ensured: {len(role_ids)}")

    # 2. Create SAL license if not exists
    lic = db.query(License).filter(License.key == SAL_LICENSE_KEY).first()
    if not lic:
        lic = License(
            id=str(uuid.uuid4()),
            key=SAL_LICENSE_KEY,
            license_type=LicenseType.SUPER_ADMIN.value,
            status=LicenseStatus.ACTIVE,
            valid_from=datetime.now(timezone.utc),
            valid_until=datetime(2099, 12, 31),
        )
        db.add(lic)
        db.flush()
        print(f"SAL license created: {SAL_LICENSE_KEY}")
    else:
        print(f"SAL license already exists: {SAL_LICENSE_KEY}")

    # 3. Create super admin user if not exists
    email = settings.super_admin_email or "eskinderbirhanuu@gmail.com"
    password = os.environ.get("SUPER_ADMIN_PASSWORD", "13@13Eskinder13ethiopia")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        super_role = db.query(Role).filter(Role.name == "SUPER_ADMIN").first()
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            employee_id=f"ZNV-SUP-{uuid.uuid4().hex[:4].upper()}",
            hashed_password=get_password_hash(password),
            full_name="IGA Super Admin",
            role_id=super_role.id if super_role else None,
            is_active=True,
            is_superuser=True,
        )
        db.add(user)
        db.flush()
        print(f"Super admin user created: {email}")
    else:
        print(f"Super admin user already exists: {email}")

    # 4. Create server identity if not exists
    fingerprint = server_identity.generate_fingerprint()
    existing = db.query(ServerIdentity).filter(
        ServerIdentity.server_role == ServerRole.SUPER_ADMIN
    ).first()
    if not existing:
        sid = server_identity.generate_server_id()
        identity = ServerIdentity(
            id=str(uuid.uuid4()),
            server_id=sid,
            fingerprint_sha256=fingerprint,
            server_role=ServerRole.SUPER_ADMIN,
            is_trusted=True,
        )
        db.add(identity)
        db.commit()
        server_identity.save_server_identity(sid, "SUPER_ADMIN")
        print(f"Server identity created: {sid}")
    else:
        print(f"Server identity already exists: {existing.server_id}")

    db.close()
    print("\nSeed complete!")
    print(f"  Email: {email}")
    print(f"  Password: {password}")
    print(f"  SAL License: {SAL_LICENSE_KEY}")
    print(f"  Login at: http://localhost:3000/login")


if __name__ == "__main__":
    seed()
