import asyncio
import json
from typing import Dict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, list[WebSocket]] = {}

    async def connect(self, key: str, ws: WebSocket):
        await ws.accept()
        if key not in self.connections:
            self.connections[key] = []
        self.connections[key].append(ws)

    def disconnect(self, key: str, ws: WebSocket):
        if key in self.connections:
            self.connections[key] = [w for w in self.connections[key] if w != ws]
            if not self.connections[key]:
                del self.connections[key]

    async def send(self, key: str, payload: dict):
        if key not in self.connections:
            return
        stale = []
        for ws in self.connections[key]:
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(key, ws)
