"""Authentication endpoints for license server admin."""
from datetime import datetime, timedelta, timezone
from jose import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import School
from app.schemas import LoginRequest, TokenResponse
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

router = APIRouter()


def get_current_admin(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        email: str = payload.get("sub")
        role: str = payload.get("role", "")
        if email is None or role != "super_admin":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return email
    except jwt.JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def verify_admin(email: str, password: str) -> bool:
    return (
        email == settings.super_admin_email
        and password == settings.super_admin_password
    )


def create_access_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": email,
        "role": "super_admin",
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest):
    if not verify_admin(data.email, data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_access_token(data.email)
    return TokenResponse(access_token=token)


@router.post("/school/login", response_model=TokenResponse)
def school_login(data: LoginRequest, db: Session = Depends(get_db)):
    from app.services.school_service import authenticate_school
    school = authenticate_school(db, data.email, data.password)
    if not school:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(school.email)
    return TokenResponse(access_token=token)
