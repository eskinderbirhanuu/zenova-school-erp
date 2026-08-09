from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)

def verify_token(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict:
    """Admin-only auth dependency. Requires `Authorization: Bearer <token>`."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("sub") != "admin":
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    if req.email != settings.super_admin_email or req.password != settings.super_admin_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": "admin", "email": req.email})
    return TokenResponse(access_token=token)

@router.post("/verify")
def verify(token_data: dict = Depends(verify_token)):
    return {"valid": True, "email": token_data.get("email")}
