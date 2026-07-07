from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.notification_manager import notification_manager
from app.services.scan_event_manager import scan_event_manager
from app.core.security import decode_access_token

router = APIRouter()


@router.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket, token: str = Query(...)):
    payload = decode_access_token(token)
    if payload is None or payload.get("type") != "access":
        await websocket.close(code=4001)
        return
    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=4001)
        return
    await notification_manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notification_manager.disconnect(user_id, websocket)
    except Exception:
        notification_manager.disconnect(user_id, websocket)


@router.websocket("/ws/nfc-scans")
async def ws_nfc_scans(websocket: WebSocket, token: str = Query(...)):
    payload = decode_access_token(token)
    if payload is None or payload.get("type") != "access":
        await websocket.close(code=4001)
        return
    await scan_event_manager.connect("nfc-scans", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        scan_event_manager.disconnect("nfc-scans", websocket)
    except Exception:
        scan_event_manager.disconnect("nfc-scans", websocket)
