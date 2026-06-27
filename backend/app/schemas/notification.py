from pydantic import BaseModel
from datetime import datetime


class NotificationPreferenceResponse(BaseModel):
    id: str
    user_id: str
    email_on: bool
    telegram_on: bool
    sms_on: bool
    telegram_chat_id: str | None = None

    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    email_on: bool | None = None
    telegram_on: bool | None = None
    sms_on: bool | None = None


class TelegramBotConnectRequest(BaseModel):
    bot_token: str


class TelegramBotResponse(BaseModel):
    id: str
    school_id: str
    bot_username: str | None = None
    bot_name: str | None = None
    logo_url: str | None = None
    is_active: bool

    class Config:
        from_attributes = True


class TelegramWebhookMessage(BaseModel):
    update_id: int
    message: dict | None = None
