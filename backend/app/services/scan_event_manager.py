from app.core.ws_manager import ConnectionManager


class ScanEventManager(ConnectionManager):
    """Broadcasts NFC scan events to connected admin/monitor clients."""

    async def connect(self, room: str, ws):
        await super().connect(room, ws)

    def disconnect(self, room: str, ws):
        super().disconnect(room, ws)

    async def broadcast(self, room: str, payload: dict):
        await super().send(room, payload)


scan_event_manager = ScanEventManager()
