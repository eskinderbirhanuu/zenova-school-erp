import httpx
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.telegram_bot import SchoolTelegramBot
from app.models.notification_preference import NotificationPreference
from app.config import settings
import logging
logger = logging.getLogger(__name__)


TELEGRAM_API = "https://api.telegram.org/bot"


async def _telegram_api(method: str, token: str, payload: dict | None = None) -> dict:
    url = f"{TELEGRAM_API}{token}/{method}"
    async with httpx.AsyncClient() as client:
        r = await client.post(url, json=payload or {}, timeout=10)
    if r.status_code != 200:
        raise BadRequestException(f"Telegram API error: {r.text}")
    data = r.json()
    if not data.get("ok"):
        raise BadRequestException(f"Telegram API error: {data.get('description', 'unknown')}")
    return data["result"]


async def connect_bot(db: Session, school_id: str, bot_token: str) -> SchoolTelegramBot:
    existing = db.query(SchoolTelegramBot).filter(SchoolTelegramBot.school_id == school_id).first()
    if existing:
        raise BadRequestException("School already has a Telegram bot configured. Disconnect first.")

    bot_info = await _telegram_api("getMe", bot_token)
    bot_username = bot_info.get("username")
    bot_name = bot_info.get("first_name", "")

    base = settings.telegram_webhook_base_url or "http://localhost:8000"
    webhook_url = f"{base}/api/v1/telegram/webhook/{school_id}"

    await _telegram_api("setWebhook", bot_token, {"url": webhook_url})

    bot = SchoolTelegramBot(
        school_id=school_id,
        bot_token=bot_token,
        bot_username=bot_username,
        bot_name=bot_name,
        webhook_url=webhook_url,
    )
    db.add(bot)
    db.commit()
    db.refresh(bot)
    return bot


async def disconnect_bot(db: Session, school_id: str):
    bot = db.query(SchoolTelegramBot).filter(
        SchoolTelegramBot.school_id == school_id,
        SchoolTelegramBot.is_active == True,
    ).first()
    if not bot:
        raise NotFoundException("No active Telegram bot found")
    try:
        await _telegram_api("deleteWebhook", bot.bot_token)
    except Exception:
        logger.warning("Failed to delete Telegram webhook for school", exc_info=True)
    bot.is_active = False
    db.commit()
    return {"message": "Bot disconnected"}


async def get_bot_status(db: Session, school_id: str) -> SchoolTelegramBot | None:
    return db.query(SchoolTelegramBot).filter(
        SchoolTelegramBot.school_id == school_id,
        SchoolTelegramBot.is_active == True,
    ).first()


async def handle_webhook(db: Session, school_id: str, payload: dict):
    msg = payload.get("message", {})
    if not msg:
        return

    chat_id = str(msg.get("chat", {}).get("id"))
    text = msg.get("text", "").strip()

    bot = db.query(SchoolTelegramBot).filter(
        SchoolTelegramBot.school_id == school_id,
        SchoolTelegramBot.is_active == True,
    ).first()
    if not bot:
        return

    if text.startswith("/start"):
        await _telegram_api("sendMessage", bot.bot_token, {
            "chat_id": chat_id,
            "text": (
                "Welcome! To link your account, please send your student ID and password.\n\n"
                "Format: /link <student_id> <password>\n"
                "Example: /link STU-2026-00001 mypassword"
            ),
        })
    elif text.startswith("/link"):
        parts = text.split()
        if len(parts) < 3:
            await _telegram_api("sendMessage", bot.bot_token, {
                "chat_id": chat_id,
                "text": "Usage: /link <student_id> <password>",
            })
            return
        student_id_str = parts[1]
        password = " ".join(parts[2:])
        from app.services.auth_service import authenticate_student_parent
        from app.database import SessionLocal
        with SessionLocal() as session:
            result = authenticate_student_parent(session, student_id_str, password)
            if result.get("valid"):
                user_id = result["user_id"]
                pref = db.query(NotificationPreference).filter(
                    NotificationPreference.user_id == user_id
                ).first()
                if not pref:
                    pref = NotificationPreference(user_id=user_id, telegram_on=True, telegram_chat_id=chat_id)
                    db.add(pref)
                else:
                    pref.telegram_on = True
                    pref.telegram_chat_id = chat_id
                db.commit()
                await _telegram_api("sendMessage", bot.bot_token, {
                    "chat_id": chat_id,
                    "text": "✅ Successfully linked! You will now receive absence notifications here.",
                })
            else:
                await _telegram_api("sendMessage", bot.bot_token, {
                    "chat_id": chat_id,
                    "text": "❌ Invalid student ID or password. Please try again.",
                })
    else:
        await _telegram_api("sendMessage", bot.bot_token, {
            "chat_id": chat_id,
            "text": "Use /link <student_id> <password> to connect your account.",
        })


async def send_telegram_message(bot_token: str, chat_id: str, text: str):
    await _telegram_api("sendMessage", bot_token, {
        "chat_id": chat_id,
        "text": text,
    })
