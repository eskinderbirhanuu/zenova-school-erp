import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Float, Integer, create_engine
from sqlalchemy.orm import declarative_base
from app.core.config import settings

engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
Base = declarative_base()


def get_db():
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
