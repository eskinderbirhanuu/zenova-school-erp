"""Password Recovery API Endpoints.

Offline-safe enterprise password recovery with hierarchy-based approval chain.
Supports future Email, SMS, and 2FA providers via Protocol interfaces.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user, get_client_ip, get_user_agent
from app.models.user import User
from app.schemas.password_recovery import (
    InitiateOfflineRecoveryRequest,
    InitiateOfflineRecoveryResponse,
    ApproveRecoveryRequest,
    GenerateTempPasswordRequest,
    GenerateTempPasswordResponse,
    GenerateRecoveryCodesRequest,
    GenerateRecoveryCodesResponse,
    ListRecoveryCodesResponse,
    RecoveryCodeItem,
    VerifyRecoveryCodeRequest,
    VerifyRecoveryCodeResponse,
    ApplyRecoveryRequest,
    ApplyRecoveryResponse,
    GenerateEmergencyTokenRequest,
    GenerateEmergencyTokenResponse,
    EmergencyApplyRequest,
    EmergencyApplyResponse,
    ListAuditResponse,
    PasswordAuditEntry,
)
from app.services import password_recovery_service as prs

logger = logging.getLogger(__name__)
router = APIRouter(tags=["password-recovery"])


@router.post("/auth/recovery/initiate", response_model=InitiateOfflineRecoveryResponse)
def initiate_offline_recovery(
    data: InitiateOfflineRecoveryRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Initiate an offline-safe password recovery by email or employee_id."""
    ip = get_client_ip(request)
    ua = get_user_agent(request)
    try:
        result = prs.initiate_recovery_request(
            db, data.identifier, reason=data.reason, ip_address=ip, user_agent=ua,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/recovery/admin/temp-password", response_model=GenerateTempPasswordResponse)
def admin_generate_temp_password(
    data: GenerateTempPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin generates a temporary password for a target user."""
    ip = get_client_ip(request)
    ua = get_user_agent(request)
    try:
        result = prs.admin_generate_temp_password(
            db, data.target_user_id, current_user,
            reason=data.reason, ip_address=ip, user_agent=ua,
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/recovery/codes/generate", response_model=GenerateRecoveryCodesResponse)
def generate_recovery_codes(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate 10 single-use recovery codes for the authenticated user."""
    ip = get_client_ip(request)
    try:
        codes = prs.generate_recovery_codes(db, current_user, ip_address=ip)
        return GenerateRecoveryCodesResponse(
            codes=codes,
            message="Save these recovery codes securely. Each code can be used only once.",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/auth/recovery/codes", response_model=ListRecoveryCodesResponse)
def list_recovery_codes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List recovery codes for the authenticated user (masked, no plaintext)."""
    codes = prs.list_recovery_codes(db, current_user)
    items = [
        RecoveryCodeItem(
            id=c["id"],
            prefix=c["prefix"],
            is_used=c["is_used"],
            created_at=c["created_at"],
            expires_at=c["expires_at"],
        )
        for c in codes
    ]
    return ListRecoveryCodesResponse(codes=items)


@router.post("/auth/recovery/codes/verify", response_model=VerifyRecoveryCodeResponse)
def verify_recovery_code(
    data: VerifyRecoveryCodeRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Verify and consume a recovery code."""
    ip = get_client_ip(request)
    valid = prs.verify_recovery_code(db, data.code, data.user_id, ip_address=ip)
    if not valid:
        return VerifyRecoveryCodeResponse(valid=False, message="Invalid or expired recovery code")
    return VerifyRecoveryCodeResponse(valid=True, message="Recovery code accepted. You can now reset your password.")


@router.post("/auth/recovery/approve")
def approve_recovery(
    request: Request,
    data: ApproveRecoveryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve or reject a pending recovery request."""
    ip = get_client_ip(request)
    ua = get_user_agent(request)
    try:
        result = prs.approve_recovery_request(
            db, data.request_id, current_user,
            approved=data.approved, reason=data.reason,
            ip_address=ip, user_agent=ua,
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/recovery/apply", response_model=ApplyRecoveryResponse)
def apply_recovery(
    data: ApplyRecoveryRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Complete a recovery by setting a new password."""
    ip = get_client_ip(request)
    ua = get_user_agent(request)
    try:
        result = prs.apply_recovery_password(
            db, data.request_id, data.new_password, data.confirm_password,
            ip_address=ip, user_agent=ua,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/recovery/emergency/generate-token", response_model=GenerateEmergencyTokenResponse)
def generate_emergency_token(
    data: GenerateEmergencyTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate an emergency recovery token (requires SUPER_ADMIN or SCHOOL_OWNER)."""
    from app.core.permissions import Permission, has_permission
    if not current_user.is_superuser and not has_permission(current_user, Permission.LICENSE_MANAGE):
        raise HTTPException(status_code=403, detail="Only Super Admin can generate emergency tokens")

    from datetime import datetime, timezone, timedelta
    token = prs.generate_emergency_token(data.target_user_id, ttl_seconds=data.ttl_seconds)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=data.ttl_seconds)

    return GenerateEmergencyTokenResponse(
        token=token,
        expires_at=expires_at,
    )


@router.post("/auth/recovery/emergency/apply", response_model=EmergencyApplyResponse)
def emergency_apply(
    data: EmergencyApplyRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Apply an emergency recovery using an offline token (sudo zenova-reset-password)."""
    ip = get_client_ip(request)
    ua = get_user_agent(request)
    try:
        result = prs.emergency_apply(
            db, data.token, data.new_password, data.confirm_password,
            ip_address=ip, user_agent=ua,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/auth/recovery/audit", response_model=ListAuditResponse)
def list_audit(
    target_user_id: str | None = None,
    action: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List password recovery audit log (requires audit or admin permission)."""
    from app.core.permissions import Permission, has_permission
    if not current_user.is_superuser and not has_permission(current_user, Permission.AUDIT_VIEW):
        raise HTTPException(status_code=403, detail="Audit view permission required")
    result = prs.list_audit_log(db, target_user_id=target_user_id, action=action, limit=limit, offset=offset)
    return result
