"""Fix PostgreSQL enum to include SUPER_ADMIN license type."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("ENVIRONMENT", "development")
from sqlalchemy import text
from app.database import SessionLocal

db = SessionLocal()
try:
    db.execute(text("ALTER TYPE licensetype ADD VALUE IF NOT EXISTS 'super_admin'"))
    db.commit()
    print("ENUM 'licensetype' updated: added 'super_admin'")
except Exception as e:
    print(f"Note: {e}")
    db.rollback()
db.close()
