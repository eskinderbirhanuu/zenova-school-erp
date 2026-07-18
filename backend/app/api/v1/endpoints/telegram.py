from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.core.permissions import require_permission, Permission
from app.schemas.notification import TelegramBotConnectRequest, TelegramBotResponse
from app.services import telegram_bot_service
from app.models.user import User

router = APIRouter(tags=["telegram"])
ADMIN = [require_permission(Permission.SETTINGS_MANAGE, Permission.AUDIT_VIEW)]


@router.post("/telegram/bot/connect", response_model=TelegramBotResponse)
async def connect_telegram_bot(
    data: TelegramBotConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = await telegram_bot_service.connect_bot(db, current_user.school_id, data.bot_token)
    return bot


@router.get("/telegram/bot/status", response_model=TelegramBotResponse | None)
async def get_telegram_bot_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await telegram_bot_service.get_bot_status(db, current_user.school_id)


@router.delete("/telegram/bot/disconnect")
async def disconnect_telegram_bot(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await telegram_bot_service.disconnect_bot(db, current_user.school_id)


@router.post("/telegram/webhook/{school_id}")
async def telegram_webhook(
    school_id: str,
    payload: dict,
    x_telegram_bot_sig: str = Header("", alias="X-Telegram-Bot-Sig"),
    db: Session = Depends(get_db),
):
    # Verify webhook signature using bot token HMAC (critical: Telegram sends arbitrary payloads)
    import hmac, hashlib
    bot = await telegram_bot_service.get_bot_status(db, school_id)
    if not bot or not bot.bot_token:
        raise HTTPException(404, detail="Bot not configured")
    
    payload_str = json.dumps(payload, sort_keys=True, default=str)
    expected = hmac.new(bot.bot_token.encode(), payload_str.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_telegram_bot_sig):
        raise HTTPException(401, detail="Invalid webhook signature")
    
    await telegram_bot_service.handle_webhook(db, school_id, payload)
    return {"ok": True}
