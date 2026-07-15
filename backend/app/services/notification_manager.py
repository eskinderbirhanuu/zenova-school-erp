from app.core.ws_manager import ConnectionManager


class NotificationManager(ConnectionManager):
    async def connect(self, user_id: str, ws):
        await super().connect(user_id, ws)

    def disconnect(self, user_id: str, ws):
        super().disconnect(user_id, ws)

    async def push(self, user_id: str, payload: dict):
        await super().send(user_id, payload)


notification_manager = NotificationManager()
