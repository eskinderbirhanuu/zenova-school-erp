from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base, Query
from app.config import settings


@event.listens_for(Query, "before_compile", retval=True)
def _filter_soft_deleted(query: Query) -> Query:
    if query._execution_options.get("include_deleted"):
        return query

    entities = []
    for desc in query.column_descriptions:
        entity = desc.get("entity")
        if entity is not None and hasattr(entity, "deleted_at"):
            entities.append(entity)

    if not entities:
        return query

    limit = query._limit_clause
    offset = query._offset_clause
    query._limit_clause = None
    query._offset_clause = None

    for entity in entities:
        query = query.filter(entity.deleted_at.is_(None))

    query._limit_clause = limit
    query._offset_clause = offset
    return query

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
