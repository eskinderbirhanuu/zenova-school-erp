from pydantic import BaseModel, ConfigDict
from datetime import datetime


class NotificationPreferenceResponse(BaseModel):
    id: str
    user_id: str
    email_on: bool
    push_on: bool
    telegram_on: bool
    sms_on: bool
    telegram_chat_id: str | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferenceUpdate(BaseModel):
    email_on: bool | None = None
    push_on: bool | None = None
    telegram_on: bool | None = None
    sms_on: bool | None = None


class PushDeviceRegister(BaseModel):
    platform: str
    token: str


class PushDeviceResponse(BaseModel):
    id: str
    user_id: str
    platform: str
    token: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TelegramBotConnectRequest(BaseModel):
    bot_token: str


class TelegramBotResponse(BaseModel):
    id: str
    school_id: str
    bot_username: str | None = None
    bot_name: str | None = None
    logo_url: str | None = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TelegramWebhookMessage(BaseModel):
    update_id: int
    message: dict | None = None
