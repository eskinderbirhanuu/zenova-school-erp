from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.webauthn_credential import WebAuthnCredential
from app.services import webauthn_service
from app.config import settings as _settings

_COOKIE_SECURE = _settings.cookie_secure

router = APIRouter(tags=["webauthn"])


class RegistrationChallengeRequest(BaseModel):
    device_name: str | None = Field(None, max_length=255)


class RegistrationChallengeResponse(BaseModel):
    challenge: str
    rp_id: str
    rp_name: str
    user_id: str
    user_name: str


class RegistrationVerifyRequest(BaseModel):
    credential_id: str
    client_data_json: str
    attestation_object: str
    device_name: str | None = None
    origin: str


class RegistrationVerifyResponse(BaseModel):
    success: bool
    message: str


class AuthChallengeRequest(BaseModel):
    credential_id: str | None = None


class AuthChallengeResponse(BaseModel):
    challenge: str
    credential_ids: list[str]
    rp_id: str


class AuthVerifyRequest(BaseModel):
    credential_id: str
    client_data_json: str
    authenticator_data: str
    signature: str
    origin: str


class AuthVerifyResponse(BaseModel):
    success: bool
    access_token: str | None = None
    refresh_token: str | None = None
    employee_id: str | None = None
    role_name: str | None = None


class CredentialListResponse(BaseModel):
    credentials: list[dict]


class CredentialDeleteResponse(BaseModel):
    success: bool


_CHALLENGES: dict[str, str] = {}  # nonce -> challenge (in-memory, ok for single-process)


@router.post("/webauthn/register/challenge", response_model=RegistrationChallengeResponse)
def webauthn_register_challenge(
    data: RegistrationChallengeRequest,
    current_user: User = Depends(get_current_user),
):
    challenge = webauthn_service.generate_challenge()
    nonce = webauthn_service.generate_challenge()
    _CHALLENGES[nonce] = challenge

    return RegistrationChallengeResponse(
        challenge=challenge,
        rp_id=webauthn_service.RP_ID,
        rp_name=webauthn_service.RP_NAME,
        user_id=current_user.id,
        user_name=current_user.email or current_user.employee_id or current_user.id,
    )


@router.post("/webauthn/register/verify", response_model=RegistrationVerifyResponse)
def webauthn_register_verify(
    data: RegistrationVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.credential_id == data.credential_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Credential already registered")

    challenge = _CHALLENGES.pop(next(iter(_CHALLENGES), None), "")

    cose_key_hex = webauthn_service.verify_attestation(
        credential_id=data.credential_id,
        client_data_json=data.client_data_json,
        attestation_object=data.attestation_object,
        challenge=challenge,
        origin=data.origin,
    )
    if not cose_key_hex:
        raise HTTPException(status_code=400, detail="Attestation verification failed")

    cred = WebAuthnCredential(
        user_id=current_user.id,
        credential_id=data.credential_id,
        public_key_cbor=cose_key_hex,
        device_name=data.device_name or "Unknown device",
    )
    db.add(cred)
    db.commit()

    return RegistrationVerifyResponse(success=True, message="Passkey registered")


@router.post("/webauthn/auth/challenge", response_model=AuthChallengeResponse)
def webauthn_auth_challenge(
    data: AuthChallengeRequest,
    db: Session = Depends(get_db),
):
    challenge = webauthn_service.generate_challenge()
    nonce = webauthn_service.generate_challenge()
    _CHALLENGES[nonce] = challenge

    q = db.query(WebAuthnCredential).filter(WebAuthnCredential.is_active == True)
    if data.credential_id:
        q = q.filter(WebAuthnCredential.credential_id == data.credential_id)
    creds = q.all()

    return AuthChallengeResponse(
        challenge=challenge,
        credential_ids=[c.credential_id for c in creds],
        rp_id=webauthn_service.RP_ID,
    )


@router.post("/webauthn/auth/verify", response_model=AuthVerifyResponse)
def webauthn_auth_verify(
    body: AuthVerifyRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    cred = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.credential_id == body.credential_id,
        WebAuthnCredential.is_active == True,
    ).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")

    challenge = _CHALLENGES.pop(next(iter(_CHALLENGES), None), "")

    valid = webauthn_service.verify_assertion(
        credential_id=body.credential_id,
        client_data_json=body.client_data_json,
        authenticator_data=body.authenticator_data,
        signature=body.signature,
        public_key_hex=cred.public_key_cbor,
        challenge=challenge,
        origin=body.origin,
    )
    if not valid:
        raise HTTPException(status_code=401, detail="Assertion verification failed")

    from app.services import auth_service
    user = db.query(User).filter(User.id == cred.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive")

    role_name = auth_service.get_user_role_name(user)
    role_names = auth_service.get_user_role_names(user)
    role_names_str = ",".join(role_names) if role_names else ""
    access_token = auth_service.create_access_token({"sub": user.id, "role": role_name})
    refresh_token_str = auth_service.create_refresh_token({"sub": user.id})

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="strict",
        path="/",
        max_age=60 * 30,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_str,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="strict",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )
    response.set_cookie(
        key="user_role",
        value=role_name,
        httponly=False,
        secure=_COOKIE_SECURE,
        samesite="strict",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )
    response.set_cookie(
        key="user_roles",
        value=role_names_str,
        httponly=False,
        secure=_COOKIE_SECURE,
        samesite="strict",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )

    cred.last_used_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    db.commit()

    return AuthVerifyResponse(
        success=True,
        access_token=access_token,
        refresh_token=refresh_token_str,
        employee_id=user.employee_id,
        role_name=role_name,
    )


@router.get("/webauthn/credentials", response_model=CredentialListResponse)
def webauthn_list_credentials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    creds = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.user_id == current_user.id,
        WebAuthnCredential.is_active == True,
    ).all()
    return CredentialListResponse(
        credentials=[
            {
                "id": c.id,
                "credential_id": c.credential_id,
                "device_name": c.device_name,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "last_used_at": c.last_used_at.isoformat() if c.last_used_at else None,
            }
            for c in creds
        ]
    )


@router.delete("/webauthn/credentials/{credential_id}", response_model=CredentialDeleteResponse)
def webauthn_delete_credential(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cred = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.id == credential_id,
        WebAuthnCredential.user_id == current_user.id,
    ).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    cred.is_active = False
    db.commit()
    return CredentialDeleteResponse(success=True)
