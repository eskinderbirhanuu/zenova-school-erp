from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_customer_branding_columns()


def _ensure_customer_branding_columns():
    """Idempotently add branding columns to an existing customers table.

    create_all() does not ALTER existing tables; this covers upgrades of
    databases created before the branding fields existed.
    """
    import logging
    from sqlalchemy import inspect, text

    logger = logging.getLogger("zenova.cc.db")
    inspector = inspect(engine)
    if "customers" not in inspector.get_table_names():
        return
    existing = {col["name"] for col in inspector.get_columns("customers")}
    new_columns = {
        "logo_url": "VARCHAR(500) DEFAULT ''",
        "primary_color": "VARCHAR(20) DEFAULT '#6366F1'",
        "secondary_color": "VARCHAR(20) DEFAULT '#8B5CF6'",
        "accent_color": "VARCHAR(20) DEFAULT '#EC4899'",
        "tagline": "VARCHAR(255) DEFAULT ''",
        "features": "TEXT DEFAULT '{}'",
        "local_url": "VARCHAR(500) DEFAULT ''",
        "local_url_label": "VARCHAR(255) DEFAULT ''",
    }
    with engine.begin() as conn:
        for col, ddl in new_columns.items():
            if col not in existing:
                conn.execute(text(f"ALTER TABLE customers ADD COLUMN {col} {ddl}"))
                logger.info("Added missing column customers.%s", col)
