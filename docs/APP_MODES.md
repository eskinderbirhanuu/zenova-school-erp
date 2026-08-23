# ZENOVA APP_MODE — Org vs School Separation

## Overview

ZENOVA runs two distinct products from the **same codebase**, differentiated at deploy time by `APP_MODE`:

| Mode | Product | Installer | Login | Accessible Routes |
|---|---|---|---|---|
| `school` | **School ERP** | School ID + License Key | `/login` | School routes only (`/admin`, `/registrar`, `/finance`, etc.) |
| `org` | **Control Center** | Super Admin + Master Key | `/super-admin/login` | Org routes only (`/super-admin/*`, `/platform/*`) |

**Key principle**: Each server has exactly ONE identity. No choice presented. No cross-access.

---

## Configuration

### Runtime Config (client + middleware)

`public/runtime-config.js` (served by nginx, editable without rebuild):

```js
window.__RUNTIME_CONFIG__ = {
  API_URL: "/api/v1",
  APP_MODE: "school"   // or "org"
}
```

### Middleware Env (server-side)

`docker-compose.vps.yml` → frontend service:

```yaml
environment:
  ZENOVA_API_URL: "http://backend:8000/api/v1"
  ZENOVA_APP_MODE: "${ZENOVA_APP_MODE:-school}"
```

`.env.vps` per server:

```bash
# School server
ZENOVA_APP_MODE=school

# Org server (VM)
ZENOVA_APP_MODE=org
```

### Nginx Serves Runtime Config

`deploy/nginx.conf` serves `/runtime-config.js` directly (bypasses Next.js middleware):

```nginx
location /runtime-config.js {
    add_header Content-Type application/javascript;
    add_header Cache-Control "public, max-age=31536000, immutable";
    return 200 "window.__RUNTIME_CONFIG__ = { API_URL: '/api/v1', APP_MODE: 'school' };";
}
```

**Org server** must override this file (docker cp or volume mount) to `APP_MODE: 'org'`.

---

## Middleware Behavior (`frontend/src/proxy.ts`)

Reads `process.env.ZENOVA_APP_MODE` at request time.

### School Mode (default)

| Request | Action |
|---|---|
| `/login` | Allow (school login) |
| `/super-admin/*` | 307 → `/login` |
| `/installer` | 307 → `/installer/school` |
| `/installer/super-admin` | 307 → `/installer/school` |
| School routes (`/admin`, `/finance`, etc.) | Allow (role-gated) |
| Org routes (`/super-admin/*`) | Blocked |

### Org Mode

| Request | Action |
|---|---|
| `/login` | 307 → `/super-admin/login` |
| `/super-admin/login` | Allow (org login) |
| `/installer` | 307 → `/installer/super-admin` |
| `/installer/school` | 307 → `/installer/super-admin` |
| School routes | 307 → `/super-admin/dashboard` |
| `/super-admin/*` | Allow (role-gated) |

---

## Installer Page (`frontend/src/app/(installer)/installer/page.tsx`)

- Reads `getAppMode()` from `runtime-config.ts`
- Auto-redirects to correct branch:
  - Org → `/installer/super-admin`
  - School → `/installer/school`
- Never shows both options (no choice presented)

---

## Deployment Procedure

### Physical School Server

```bash
# 1. Set env
ZENOVA_APP_MODE=school

# 2. Deploy (docker compose)
docker compose -f docker-compose.vps.yml --env-file .env.vps up -d

# 3. Verify
curl -kfsS https://<domain>/runtime-config.js
# → window.__RUNTIME_CONFIG__ = { API_URL: "/api/v1", APP_MODE: "school" }

curl -kfsS -I https://<domain>/installer
# → 307 /installer/school

curl -kfsS -I https://<domain>/super-admin/login
# → 307 /login
```

### Org Server (VM)

```bash
# 1. Set env
ZENOVA_APP_MODE=org

# 2. Deploy
docker compose -f docker-compose.vps.yml --env-file .env.vps up -d

# 3. Override runtime-config.js (one-time, survives restarts)
docker cp runtime-config-org.js deploy-frontend-1:/app/public/runtime-config.js
# Content: APP_MODE: "org"

# 4. Restart frontend
docker compose -f docker-compose.vps.yml --env-file .env.vps restart frontend nginx

# 5. Verify
curl -kfsS https://<domain>/runtime-config.js
# → APP_MODE: "org"

curl -kfsS -I https://<domain>/login
# → 307 /super-admin/login
```

---

## Verification Checklist

- [ ] School server: `/installer` → `/installer/school`
- [ ] School server: `/super-admin/login` → `/login`
- [ ] School server: `/admin/dashboard` accessible (with school role)
- [ ] Org server: `/login` → `/super-admin/login`
- [ ] Org server: `/installer` → `/installer/super-admin`
- [ ] Org server: `/admin/dashboard` → `/super-admin/dashboard`
- [ ] Both: `/runtime-config.js` returns correct `APP_MODE`
- [ ] Both: CSP headers include `script-src 'self' 'unsafe-inline'`

---

## Architecture Notes

- **No rebuild required** to switch modes — only env + runtime-config.js
- **Single codebase**, single Docker image, single binary
- **Middleware enforces server-side** (before any page renders)
- **Client reads same config** via `window.__RUNTIME_CONFIG__`
- **License authority** (`/api/v1/license/*`) runs on BOTH servers but only org uses it as authority; schools verify against org