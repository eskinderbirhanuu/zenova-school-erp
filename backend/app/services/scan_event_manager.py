import asyncio
import json
from typing import Dict
from fastapi import WebSocket


class ScanEventManager:
    """Broadcasts NFC scan events to connected admin/monitor clients."""

    def __init__(self):
        self.connections: Dict[str, list[WebSocket]] = {}

    async def connect(self, room: str, ws: WebSocket):
        await ws.accept()
        if room not in self.connections:
            self.connections[room] = []
        self.connections[room].append(ws)

    def disconnect(self, room: str, ws: WebSocket):
        if room in self.connections:
            self.connections[room] = [w for w in self.connections[room] if w != ws]
            if not self.connections[room]:
                del self.connections[room]

    async def broadcast(self, room: str, payload: dict):
        if room not in self.connections:
            return
        stale = []
        for ws in self.connections[room]:
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(room, ws)


scan_event_manager = ScanEventManager()
