import hashlib
from app.config import settings


def hash_card_uid(raw_uid: str) -> str:
    return hashlib.sha256(f"{raw_uid}:{settings.secret_key}".encode()).hexdigest()
