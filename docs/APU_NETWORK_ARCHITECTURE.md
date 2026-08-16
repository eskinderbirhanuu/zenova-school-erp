# APU Network Architecture

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE.
> WHAT / WHY / HOW / WHAT-it-reuses for the Local / Cloud / Hybrid connectivity model.

## 1. WHAT are we building?

A connectivity layer in the APU app that supports the **existing ZENOVA deployment architecture**:

- **Local mode** — school backend on the school LAN; teacher phone on the same LAN.
- **Cloud mode** — school backend on a VPS; parent/student phones over the Internet.
- **Hybrid mode** — both endpoints exist; teachers prefer the LAN, parents/students use the cloud.

APU does **not** invent a new deployment architecture. It consumes the school's existing backend wherever it lives.

## 2. WHY

- Teachers must operate **inside the school LAN even when the Internet is down** (critical requirement).
- Parents and students are **cloud-connected** and must not be forced onto the LAN.
- One app must handle either topology transparently.

## 3. HOW it works

### 3.1 Today (verified)
- The backend has **no `DEPLOYMENT_MODE`/`LOCAL_API` setting**. A single per-school instance is deployed either on a LAN server (via `deploy.sh school`) or on a VPS.
- The Control Center `resolve` endpoint returns `api_url = https://{domain}` — **cloud only**.
- Auth and all role data live on the **school backend itself** (the only cloud deps are the license server + Control Center for directory/branding).
- License validation: startup `.lic` validation, online check, heartbeats every 6h, **45-day offline grace** — so a school backend is effectively offline-capable after activation.

### 3.2 Proposed APU connectivity model (document only)
```
                    APU Connectivity Layer
┌─────────────────────────────────────────────────────────┐
│  Endpoint resolution (per resolved school)              │
│   cloud_url  = api_url from resolve (https://domain)     │
│   local_url  = optional per-school LAN endpoint         │
│                 (configurable / discoverable — future)   │
├─────────────────────────────────────────────────────────┤
│  Connectivity detection                                  │
│   - reachability probe (health/live) with short timeout  │
│   - mode = local | cloud | offline                      │
├─────────────────────────────────────────────────────────┤
│  Routing policy                                          │
│   TEACHER   → prefer local_url when reachable           │
│   PARENT/STUDENT → cloud_url only                       │
│   Fallback  → cloud_url if local unreachable (and vice   │
│               versa), then offline mode                 │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Hybrid deployment documentation points (for `APU_DEPLOYMENT.md` / `APU_SYNC_ARCHITECTURE.md`)
- **Local endpoint:** `local_url` per school (see `APU_SCHOOL_RESOLUTION.md` §5 for candidate designs).
- **Cloud endpoint:** `api_url` from resolve.
- **Connectivity detection:** periodic `GET {base}/api/v1/health/live` (short timeout), plus OS reachability; cache last-known-good base URL.
- **Local-first teacher:** default base URL = LAN endpoint when reachable.
- **Cloud-first parent/student:** default base URL = `api_url`.
- **Synchronization requirements:** documented in `APU_SYNC_ARCHITECTURE.md` (not implemented).
- **Retry behavior:** exponential backoff for failed sync, idempotent operations, offline queue.
- **Conflict handling:** server timestamp wins; `ConflictLog` reuse.
- **Offline behavior:** `APU_OFFLINE_FIRST.md`.
- **Recovery behavior:** re-queue on reconnect, drain queue, reconcile with server.

## 4. Local network security

- **Never assume LAN = trusted.** The same login, MFA (if enabled), and authorization apply on LAN.
- Local HTTP (non-TLS) is only acceptable inside a trusted LAN; the app should:
  - prefer HTTPS even on LAN when the school server has a certificate,
  - warn when connecting over plain HTTP,
  - not send credentials over untrusted networks (public Wi-Fi).
- WebSocket notifications use `?token=<access JWT>` — keep short-lived (30 min) and refresh-driven.

## 5. WHAT it reuses

| Piece | Reused from |
|---|---|
| Health probe | `GET /api/v1/health/live` (`backend/app/api/v1/endpoints/health.py`) |
| Cloud base URL | Control Center `resolve` → `api_url` |
| Offline license grace | `license_offline_grace_days` (45d) + circuit breakers in `license_crypto.py` |
| Deployment modes | `deploy/deploy.sh` (`school` \| `cc` \| `license`) |

## 6. Dependencies / assumptions / risks / unresolved

- **Dependencies:** LAN reachability requires the phone and school server on the same network segment; `EXPO_PUBLIC_CONTROL_CENTER_URL` set at build.
- **Assumptions:** the school's local server exposes the same `/api/v1` surface as the VPS (same image). Confirmed — same `zenova/backend` image is used for both.
- **Risks:** DNS rebinding if local_url is attacker-controlled (mitigate by resolving via Control Center, not arbitrary input); mixed HTTP/HTTPS content; certificate validation on self-signed LAN certs (trust policy documented in `APU_CERT_TRUST_POLICY.md` — never disable TLS validation app-wide).
- **Unresolved:** LAN endpoint discovery mechanism (mDNS vs config vs resolve field — decided: resolve field + manual override, see `APU_SCHOOL_RESOLUTION.md` §5).
