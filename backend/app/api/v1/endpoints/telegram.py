from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.core.permissions import require_role
from app.schemas.notification import TelegramBotConnectRequest, TelegramBotResponse
from app.services import telegram_bot_service
from app.models.user import User

router = APIRouter(tags=["telegram"])
ADMIN = [require_role("SUPER_ADMIN"), require_role("ADMIN"), require_role("DIRECTOR")]


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
    db: Session = Depends(get_db),
):
    await telegram_bot_service.handle_webhook(db, school_id, payload)
    return {"ok": True}
