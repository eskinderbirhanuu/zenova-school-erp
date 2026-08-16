# APU School Resolution

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE.
> WHAT / WHY / HOW / WHAT-it-reuses for School-ID lookup and multi-school support.

## 1. WHAT are we building?

A **School-ID** entry point that resolves a short code to a school's branding, public endpoint, and feature flags — enabling **one APU app to serve many schools**.

## 2. WHY

- A parent/teacher/student should enter a short memorable code (e.g. `OMEGA001`), not a URL.
- The app must know which backend to authenticate against and how to theme the UI per school.
- Branding must not be hard-coded — **Omega is only one customer example**.

## 3. HOW it works (verified)

### 3.1 Flow
```
User enters School ID
   │
   ▼
POST {CONTROL_CENTER}/api/v1/public/schools/resolve   Body: {"code": "<CODE>"}
   │
   ├─ found: true → { school: { name, domain, code, api_url, branding, features } }
   └─ found: false → { found: false }   (also used for network error today — see risk)
```

### 3.2 Resolve response shape (verified, `control-center/backend/app/api/v1/endpoints/partners.py`)
```json
{
  "found": true,
  "school": {
    "name": "Omega Academy",
    "domain": "omega.zenova.et",
    "code": "OMEGA001",
    "api_url": "https://omega.zenova.et",
    "branding": {
      "logo_url": "https://.../logo.png",
      "primary_color": "#6366F1",
      "secondary_color": "#8B5CF6",
      "accent_color": "#EC4899",
      "tagline": "Learn today, lead tomorrow"
    },
    "features": { "attendance": true, "finance": true, "library": true }
  }
}
```
- `api_url` is always `https://{domain}` and points to the **school's own ERP backend** (the Control Center never proxies traffic).
- Only **active** customers resolve (`is_active`). Code matches `domain LIKE 'code.%'` or exact `domain`.
- Invalid/inactive codes → `{"found": false}` (no data leak).

### 3.3 Remote config (version gates)
```
GET {CONTROL_CENTER}/api/v1/public/config
```
```json
{
  "minimum_version": "1.0.0",
  "recommended_version": "1.0.0",
  "maintenance_mode": false,
  "message": "",
  "features": { "attendance": true, "finance": true, "library": true }
}
```
- Boot gate: if `maintenance_mode` OR `APP_VERSION < minimum_version` → block with the appropriate screen.

## 4. APU app behavior

- `mobile-app/src/services/resolve.ts#resolveSchool(code)` — 8s timeout.
- `mobile-app/src/screens/SchoolSelectScreen.tsx` — School ID field (primary), plus search (`GET /public/schools?search=`) and manual URL entry.
- On success: store `schoolUrl`, school name, and branding in SecureStore; build a `SchoolTheme` via `themeFromBranding()` (`mobile-app/src/theme/colors.ts`, WCAG 4.5:1 button contrast).
- Non-resolved/manual-URL schools keep the ZENOVA default theme (branding only comes from resolve).

## 5. Local / LAN endpoint (implemented — 2026-08-09)

Teacher local-network mode needs a **configurable/discoverable local endpoint**. Today `api_url` is cloud-only.

**Decision (R2):** adopt **candidate 1 as the primary** and **candidate 4 as the fallback** (both implemented):

1. **Primary — resolve-driven `local_url`** (Control Center change): `Customer` gains an optional `local_url` field returned by resolve:
   ```json
   {
     "found": true,
     "school": {
       "name": "Omega Academy",
       "api_url": "https://omega.zenova.et",
       "local_url": "https://192.168.1.8:8443",
       "local_url_label": "School LAN server",
       ...
     }
   }
   ```
   - `local_url`/`local_url_label` are optional `Customer` columns (added idempotently in `control-center/backend/app/database.py#init_db`); they are only populated when the school's deployment registers one (internet-connected VPS-only schools leave them empty).
   - The APU never follows `local_url` blindly — it probes `GET {local_url}/api/v1/health/live` with a ~2s timeout (`mobile-app/src/services/resolve.ts#probeLocalEndpoint`) and only then switches the base URL.
2. **Fallback — per-school manual override (SecureStore):** in `SchoolSelectScreen`, a "Local server address (optional)" field stores `local_url` per school under `zenova.localUrl.<code>` (scoped by school code). This covers air-gapped schools whose Control Center is unreachable during setup.
3. **Deferred — mDNS/Bonjour discovery (`_zenova._tcp`):** not implemented. LAN broadcast is unreliable across managed Wi-Fi segments and adds a trust surface; revisit only if a school has no way to configure the address.

**Rejected (do not implement):** hard-coding one IP; auto-switching to LAN for non-teacher roles (parents/students stay cloud-connected per `APU_NETWORK_ARCHITECTURE.md`).

**Base-URL policy (`mobile-app/src/services/resolve.ts#pickBaseUrl`):**
```
override_url (SecureStore) configured?
   yes ─► probe it
            reachable? ► use override
            no ────────▼
local_url (resolve) configured? ─────────────┐
   yes ─► probe it                            │
            reachable? ► use local_url        │
            no ────────▼                      ▼
use cloud api_url  ◄──────────────────── fall back
```
Probe = `GET {candidate}/api/v1/health/live`, ~2s timeout. Cloud `api_url` is the unconditional fallback.

## 6. Multi-school guarantees

- One APU codebase serves every school.
- Tenant identity comes from the resolved `api_url` + the JWT's `sub`/`school_id` (resolved server-side per request). The app never mixes schools — changing school clears session + branding.
- Switching school clears SecureStore session/branding/URL and returns to the School screen.

## 7. WHAT it reuses

| Piece | Reused from |
|---|---|
| School lookup | `control-center/backend` `POST /api/v1/public/schools/resolve`, `GET /api/v1/public/schools` |
| Remote config | `control-center/backend/app/remote_config.json` via `GET /api/v1/public/config` |
| Branding fields | Control Center `Customer` (`logo_url`, `primary/secondary/accent_color`, `tagline`, `features`) |
| Theme engine | `mobile-app/src/theme/colors.ts` (already implemented) |

## 8. Dependencies / assumptions / risks / unresolved

- **Dependencies:** `EXPO_PUBLIC_CONTROL_CENTER_URL` injected at build time (currently empty in the repo — set it in the deployment env).
- **Assumptions:** every school is registered as an active customer in the Control Center before APU use.
- **Risks:** `resolveSchool` returns `found:false` on network errors too — the app currently mislabels network failure as "school not found" (**MOBILE GAP**: distinguish transport failure from not-found).
- **Unresolved:** the LAN endpoint design above (needs a product decision).
