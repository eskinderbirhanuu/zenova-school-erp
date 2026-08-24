# APU Notifications

> **Status:** IMPLEMENTED (2026-08-09) — device-token registration + FCM relay live + WS push + tap deep-links (2026-08-10).
> Backend: `backend/app/services/fcm_relay.py`, `push_devices` table, `/notifications/device-token*` (feature-gated `FEATURE_PUSH`), WS endpoint `ws.py` (`notification_manager.push` by user_id, role-agnostic). Mobile: `mobile-app/src/services/push.ts` (register on sign-in/boot, unregister on sign-out), tap deep-links via `mobile-app/src/services/deepLink.ts` + expo-notifications response listener. See `APU_GAPS_AND_DEPENDENCIES.md` rows N2, N3.

## 1. WHAT are we building?

Delivery of school events (announcements, new grades, attendance confirmations, fee reminders) to APU phones.

## 2. WHY

- Teachers need to be told when the schedule changes or a message arrives.
- Parents want to know the moment a grade is published or a fee reminder is issued.
- The existing ZENOVA notification pipeline is in-app only (WS + DB inbox); phones need a push channel.

## 3. HOW it works (design)

### 3.1 Current pipeline (verified — in-app only)
- School backend writes `Notification` rows on events (`backend/app/services/notification_service.py`).
- Web UI reads `/notifications`; real-time via `/ws/notifications?token=<jwt>`.
- **Gap:** `/notifications` and `/messages` require `ALL` permissions — **PARENT/STUDENT get 403** today. The WebSocket also only pushes to users authorized for that endpoint.
- `/notifications/preferences` is available to all roles.

### 3.2 Proposed APU push channel (document only)
```
School backend event
   │  (existing Notification row already written)
   ▼
Notification → deliver via FCM (Android) / APNs (iOS)
   │
   ├─ In-app: WS notifications (existing)
   ├─ Mobile: FCM/APNs push (new)
   └─ Email/SMS: future channels (Feature-flag gated, per ZENOVA policy)
```

### 3.3 FCM plumbing (design)
1. APU registers device token with the school backend (new endpoint, e.g. `POST /notifications/device-token`).
2. School backend (or a worker) forwards to FCM using a service-account credential (per-school `FEATURE_PUSH`).
3. APU shows the notification and, on tap, deep-links to the item (announcement, invoice, marksheet).

## 4. Permissions fix (backend, before launch)

- Add PARENT/STUDENT to the allowed set for reading their own notifications and messages:
  - `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`
  - `GET /messages`, `POST /messages`, `POST /messages/{id}/read`
- Keep inbox scoped per user (`Notification.user_id == current_user.id`) — verified the model supports per-user rows.
- This also unblocks the WebSocket push for parent/student.

## 5. Preferences

- Respect `NotificationPreference` (`/notifications/preferences`): push only for categories the user enabled; never spam for disabled categories.
- Quiet hours: document as future client-side setting.

## 6. WHAT it reuses

| Piece | Reused from |
|---|---|
| Notification rows | `notification_service.py` |
| Preferences | `/notifications/preferences` |
| Real-time | `/ws/notifications` (existing, once perms fixed) |

## 7. Dependencies / assumptions / risks / unresolved

- **Dependencies:** FCM project + service account; per-school `FEATURE_PUSH` flag; per-school FCM credentials (or a central relay in the Control Center).
- **Assumptions:** push is best-effort (in-app inbox is the source of truth); offline phones receive push on reconnect.
- **Risks:** token churn (re-register on login/rotation); sending to stale tokens (FCM returns `UNREGISTERED` → prune).
- **Unresolved:** central FCM relay vs per-school credentials; iOS APNs registration; whether the WS or a poll drives the in-app feed.
