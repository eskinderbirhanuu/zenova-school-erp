"""Fix PostgreSQL enum - add SUPER_ADMIN in correct case."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("ENVIRONMENT", "development")
from sqlalchemy import text
from app.database import SessionLocal

db = SessionLocal()

# Check current values
rows = db.execute(text("SELECT enum_range(NULL::licensetype)")).fetchone()
print(f"Before: {rows[0]}")

# The DB enum was created with uppercase names: MAIN, BRANCH, etc.
# SQLAlchemy SAEnum stores the Python enum MEMBER NAME, not the value
# So we need to add 'SUPER_ADMIN' (uppercase) not 'super_admin'
try:
    db.execute(text("ALTER TYPE licensetype ADD VALUE 'SUPER_ADMIN'"))
    db.commit()
    print("Added 'SUPER_ADMIN' (uppercase)")
except Exception as e:
    print(f"Note: {e}")
    db.rollback()

rows = db.execute(text("SELECT enum_range(NULL::licensetype)")).fetchone()
print(f"After: {rows[0]}")

# Also fix licensestatus if 'active' doesn't work
try:
    db.execute(text("ALTER TYPE licensestatus ADD VALUE 'ACTIVE'"))
    db.commit()
except:
    db.rollback()

db.close()
