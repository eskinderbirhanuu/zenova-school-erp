import asyncio
import json
from typing import Dict
from fastapi import WebSocket


class NotificationManager:
    def __init__(self):
        self.connections: Dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        if user_id not in self.connections:
            self.connections[user_id] = []
        self.connections[user_id].append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self.connections:
            self.connections[user_id] = [w for w in self.connections[user_id] if w != ws]
            if not self.connections[user_id]:
                del self.connections[user_id]

    async def push(self, user_id: str, payload: dict):
        if user_id not in self.connections:
            return
        stale = []
        for ws in self.connections[user_id]:
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(user_id, ws)


notification_manager = NotificationManager()
