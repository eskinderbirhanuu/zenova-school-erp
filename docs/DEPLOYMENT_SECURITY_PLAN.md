# ZENOVA Deployment & Security Master Plan

> **Goal:** Docker-based distribution to all schools with anti-piracy, forensic watermarking, offline grace, and network-local accessibility.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Docker Containerization](#2-docker-containerization)
3. [Ubuntu Server Deployment](#3-ubuntu-server-deployment)
4. [PWA (Progressive Web App)](#4-pwa-progressive-web-app)
5. [License Hardening & Anti-Piracy](#5-license-hardening--anti-piracy)
6. [Forensic Watermarking System](#6-forensic-watermarking-system)
7. [Feature Locking (Cracked Version)](#7-feature-locking-cracked-version)
8. [Implementation Order](#8-implementation-order)
9. [File Inventory](#9-file-inventory)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    School Network                        │
│                   192.168.x.x                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Ubuntu Server (Old PC)                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │   │
│  │  │  Nginx   │  │ Frontend │  │   Backend     │  │   │
│  │  │  :80     │◄─│  :3000   │◄─│  :8000        │  │   │
│  │  └────┬─────┘  └──────────┘  └───────┬───────┘  │   │
│  │       └───────────────────────────────┘           │   │
│  │  ┌──────────┐  ┌──────────┐                       │   │
│  │  │PostgreSQL│  │  Redis   │                       │   │
│  │  │  :5432   │  │  :6379   │                       │   │
│  │  └──────────┘  └──────────┘                       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Access from same network:                               │
│  ├── Phone (WiFi)  → http://192.168.x.x:80              │
│  ├── PC (LAN)      → http://192.168.x.x:80              │
│  └── Tablet (WiFi) → http://192.168.x.x:80              │
│                                                         │
│  ✅ Works WITH or WITHOUT internet                       │
└─────────────────────────────────────────────────────────┘
```

### Services & Ports

| Service | Internal Port | External Port | Interface |
|---------|--------------|---------------|-----------|
| Nginx | 80 | 80 | 0.0.0.0 (all) |
| PostgreSQL | 5432 | - | localhost only |
| Redis | 6379 | - | localhost only |
| Backend API | 8000 | - | internal only |
| Frontend | 3000 | - | internal only |

---

## 2. Docker Containerization

### 2.1 Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim
RUN adduser --disabled-password --gecos '' zenova
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .
RUN chown -R zenova:zenova /app
USER zenova
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2.2 Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]
```

### 2.3 Root docker-compose.yml

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: ${DB_USER:-zenova}
      POSTGRES_PASSWORD: ${DB_PASS:-zenova_secret}
      POSTGRES_DB: ${DB_NAME:-zenova}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - zenova_net

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - zenova_net

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://${DB_USER:-zenova}:${DB_PASS:-zenova_secret}@postgres:5432/${DB_NAME:-zenova}
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
      ENVIRONMENT: production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    read_only: true
    networks:
      - zenova_net

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_URL: http://${SERVER_IP}:8000/api/v1
    restart: unless-stopped
    networks:
      - zenova_net

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - zenova_net

networks:
  zenova_net:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

### 2.4 Nginx Config

```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2.5 .dockerignore

```
# backend/.dockerignore
__pycache__
*.pyc
.env
.git
.venv
venv
*.db

# frontend/.dockerignore
node_modules
.next
.git
.env.local
*.tsbuildinfo
```

---

## 3. Ubuntu Server Deployment

### 3.1 Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 2 GB | 4 GB |
| CPU | 2 cores | 4 cores |
| Disk | 20 GB | 50 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Network | Static IP (DHCP reservation) | Static IP |

### 3.2 Static IP Setup (netplan)

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

### 3.3 Prerequisites Installation

```bash
# Docker
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER

# Docker Compose plugin
sudo apt-get install -y docker-compose-plugin

# Verify
docker --version && docker compose version
```

### 3.4 Deployment Script

```bash
#!/bin/bash
# scripts/deploy.sh
set -e

echo "=== ZENOVA Deployment ==="

# 1. Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker required"; exit 1; }

# 2. Generate secrets if first run
if [ ! -f .env ]; then
    echo "SECRET_KEY=$(openssl rand -hex 32)" > .env
    echo "DB_USER=zenova" >> .env
    echo "DB_PASS=$(openssl rand -hex 16)" >> .env
    echo "DB_NAME=zenova" >> .env
    echo "SERVER_IP=$(hostname -I | awk '{print $1}')" >> .env
    echo ".env file created"
fi

# 3. Start services
docker compose up -d --build

# 4. Run database migrations
docker compose exec backend alembic upgrade head

# 5. Show status
docker compose ps
echo "=== Deployment complete ==="
echo "Access at: http://$(grep SERVER_IP .env | cut -d= -f2):80"
```

### 3.5 Systemd Service (auto-start on boot)

```ini
# /etc/systemd/system/zenova.service
[Unit]
Description=ZENOVA School Management
Requires=docker.service
After=docker.service network.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/zenova
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
StandardOutput=journal

[Install]
WantedBy=multi-user.target
```

---

## 4. PWA (Progressive Web App)

### 4.1 Files to Create

| File | Description |
|------|-------------|
| `public/manifest.json` | App name, icons, theme color, display: standalone |
| `public/icons/icon.svg` | ZENOVA logo (stylized Z + gradient) |
| `public/sw.js` | Service Worker (cache + offline attendance sync) |
| `src/components/pwa/register-sw.tsx` | Service Worker registration via useEffect |
| `src/components/pwa/install-prompt.tsx` | "Install App?" beforeinstallprompt handler |

### 4.2 manifest.json

```json
{
  "name": "ZENOVA School Management",
  "short_name": "ZENOVA",
  "description": "Enterprise School Management Platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#6366f1",
  "orientation": "any",
  "icons": [
    { "src": "/icons/icon.svg", "sizes": "any", "type": "image/svg+xml" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "categories": ["education", "business"],
  "scope": "/",
  "prefer_related_applications": false
}
```

### 4.3 Service Worker (sw.js)

```javascript
// Cache strategies
const CACHE = {
  shell: 'zenova-shell-v1',
  api: 'zenova-api-v1',
  static: 'zenova-static-v1',
};

// Install: precache app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE.shell).then((cache) =>
      cache.addAll(['/', '/login', '/offline', '/manifest.json'])
    )
  );
  self.skipWaiting();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API calls → network first
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirstWithFallback(e.request, CACHE.api));
    return;
  }

  // Static assets → cache first
  e.respondWith(cacheFirstWithFallback(e.request, CACHE.static));
});

// Offline attendance sync
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-attendance') {
    e.waitUntil(syncAttendance());
  }
});

async function syncAttendance() {
  // Read from IndexedDB, POST to server, clear on success
}

// Helper: network-first with cache fallback
async function networkFirstWithFallback(request, cacheName) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch {
    return caches.match(request) || caches.match('/offline');
  }
}

// Helper: cache-first
async function cacheFirstWithFallback(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch {
    return caches.match('/offline');
  }
}
```

### 4.4 Register Component

```tsx
// src/components/pwa/register-sw.tsx
'use client';
import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
      });
    }
  }, []);
  return null;
}
```

### 4.5 Install Prompt

```tsx
// src/components/pwa/install-prompt.tsx
'use client';
import { useState, useEffect } from 'react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 glass p-4 rounded-xl shadow-2xl z-50">
      <p className="text-sm mb-2">Install ZENOVA for better experience</p>
      <button onClick={handleInstall} className="btn-primary text-sm px-4 py-2 rounded-lg">
        Install App
      </button>
    </div>
  );
}
```

### 4.6 layout.tsx Updates

```typescript
// Add to metadata in src/app/layout.tsx
export const metadata: Metadata = {
  title: "ZENOVA - School Management",
  description: "Enterprise School Management Platform",
  manifest: "/manifest.json",
  themeColor: "#6366f1",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ZENOVA" },
  icons: {
    apple: "/icons/icon.svg",
  },
};

// Add PWARegister to body
```

---

## 5. License Hardening & Anti-Piracy

### 5.1 Machine Fingerprinting

```python
# backend/app/services/license_crypto.py
import hashlib
import subprocess
import platform
import os

def get_machine_fingerprint() -> str:
    """
    Collect hardware identifiers and produce a SHA-256 fingerprint.
    Combines MAC + CPU + Motherboard + Disk + Machine ID.
    """
    components = []

    # MAC address (primary interface)
    try:
        if platform.system() == "Linux":
            with open("/sys/class/net/eth0/address") as f:
                components.append(f.read().strip())
        else:
            import uuid
            components.append(str(uuid.getnode()))
    except Exception:
        pass

    # CPU serial
    try:
        if platform.system() == "Linux":
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if "Serial" in line:
                        components.append(line.split(":")[1].strip())
                        break
    except Exception:
        pass

    # Machine ID
    try:
        with open("/etc/machine-id") as f:
            components.append(f.read().strip())
    except Exception:
        pass

    # Disk serial
    try:
        result = subprocess.run(
            ["udevadm", "info", "--query=property", "--name=/dev/sda"],
            capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.split("\n"):
            if "ID_SERIAL" in line:
                components.append(line.split("=")[1])
                break
    except Exception:
        pass

    raw = ":".join(components)
    return hashlib.sha256(raw.encode()).hexdigest()


def get_short_fingerprint() -> str:
    """8-char short fingerprint for watermarking"""
    full = get_machine_fingerprint()
    return full[:8]
```

### 5.2 RSA License Signing

```python
# backend/app/services/license_crypto.py (continued)
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
import base64
import json

RSA_KEY_SIZE = 2048


def generate_key_pair() -> tuple[bytes, bytes]:
    """Generate RSA key pair. Returns (private_pem, public_pem)."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=RSA_KEY_SIZE,
        backend=default_backend()
    )
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    public_key = private_key.public_key()
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return private_pem, public_pem


def create_license_file(school_id: str, school_name: str, machine_fingerprint: str,
                       valid_until: str, private_key_pem: bytes) -> str:
    """
    Create a signed .lic file.
    Returns base64-encoded JSON with signature.
    """
    payload = {
        "school_id": school_id,
        "school_name": school_name,
        "machine_fingerprint": machine_fingerprint,
        "valid_until": valid_until,
        "created_at": datetime.utcnow().isoformat(),
    }
    payload_json = json.dumps(payload, separators=(",", ":"))

    private_key = serialization.load_pem_private_key(
        private_key_pem, password=None, backend=default_backend()
    )
    signature = private_key.sign(
        payload_json.encode(),
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=32),
        hashes.SHA256()
    )

    license_data = {
        "payload": payload,
        "signature": base64.b64encode(signature).decode()
    }
    return base64.b64encode(json.dumps(license_data, separators=(",", ":")).encode()).decode()


def verify_license_file(license_b64: str, public_key_pem: bytes) -> dict | None:
    """Verify a .lic file and return payload if valid."""
    try:
        license_data = json.loads(base64.b64decode(license_b64))
        payload = license_data["payload"]
        signature = base64.b64decode(license_data["signature"])
        payload_json = json.dumps(payload, separators=(",", ":"))

        public_key = serialization.load_pem_public_key(
            public_key_pem, backend=default_backend()
        )
        public_key.verify(
            signature,
            payload_json.encode(),
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=32),
            hashes.SHA256()
        )
        return payload
    except Exception:
        return None
```

### 5.3 License Validation Flow

```python
# backend/app/services/license_crypto.py (continued)

def validate_license_at_startup(db: Session) -> dict:
    """
    Called on every backend startup + periodically via cron.
    Returns license status with restriction flags.
    """
    license_record = db.query(License).filter(
        License.status == LicenseStatus.ACTIVE
    ).first()

    if not license_record:
        return {"valid": False, "restrict_nfc": True, "restrict_qr": True,
                "restrict_import": True, "message": "No active license"}

    # Check expiry
    if license_record.valid_until and license_record.valid_until < datetime.utcnow():
        return {"valid": False, "restrict_nfc": True, "restrict_qr": True,
                "restrict_import": True, "message": "License expired"}

    # Check hardware binding
    current_fingerprint = get_machine_fingerprint()
    if license_record.machine_fingerprint and \
       license_record.machine_fingerprint != current_fingerprint:
        return {"valid": False, "restrict_nfc": True, "restrict_qr": True,
                "restrict_import": True, "message": "Hardware mismatch"}

    # Check offline grace period
    if not _can_reach_license_server():
        if license_record.offline_grace_start is None:
            license_record.offline_grace_start = datetime.utcnow()
            db.commit()

        grace_days = (datetime.utcnow() - license_record.offline_grace_start).days
        if grace_days > 45:
            return {"valid": False, "restrict_nfc": True, "restrict_qr": True,
                    "restrict_import": True, "message": "Offline grace period expired"}

    return {"valid": True, "restrict_nfc": False, "restrict_qr": False,
            "restrict_import": False, "message": "License valid"}
```

### 5.4 Offline Grace Period Logic

```
┌────────────────────────────────────────────┐
│         First Boot (No Internet)            │
│  License validated via .lic file + RSA      │
│  offline_grace_start = NOW                  │
└─────────────────┬──────────────────────────┘
                  │
                  ▼
     ┌───────────────────────────┐
     │  Days 1-45: ✅ Full Access │
     │  Every day checks online   │
     └──────────┬────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
  Online found     No internet
        │               │
        ▼               ▼
  Reset grace     Days 46+:
  counter         ❌ LOCKED
  ✅ Full         (until .lic renewed)
```

### 5.5 Docker Image Watermarking

```yaml
# In docker-compose.yml, each school gets a unique build arg
services:
  backend:
    build:
      context: ./backend
      args:
        SCHOOL_WATERMARK: "${SCHOOL_WATERMARK}"
        BUILD_ID: "${BUILD_ID}"
```

```dockerfile
# In Dockerfile, watermark is baked into the image
ARG SCHOOL_WATERMARK
ARG BUILD_ID
ENV SCHOOL_WATERMARK=${SCHOOL_WATERMARK}
ENV BUILD_ID=${BUILD_ID}
LABEL zenova.school="${SCHOOL_WATERMARK}"
LABEL zenova.build="${BUILD_ID}"
```

---

## 6. Forensic Watermarking System

### 6.1 Watermark Placement (8 Locations)

| # | Location | Storage Method | Removal Difficulty |
|---|---|---|---|
| 1 | `backend/.env` | `SCHOOL_WATERMARK` env var | ⭐⭐⭐ |
| 2 | Frontend JS bundle | `window.__ZENOVA_SCHOOL__` (minified) | ⭐⭐ |
| 3 | Database seed data | Fictional student name unique per school | ⭐⭐⭐⭐⭐ |
| 4 | License key | Public key contains encoded school code | ⭐⭐⭐⭐ |
| 5 | API response header | `X-Zenova-Instance` (encrypted) | ⭐⭐ |
| 6 | Docker image label | `LABEL zenova.school` in Dockerfile | ⭐⭐⭐ |
| 7 | Database column name | Decoy column in `schools` table | ⭐⭐⭐⭐⭐ |
| 8 | QR code on login page | Tiny dot pattern watermark | ⭐⭐⭐⭐ |

### 6.2 Watermark Embedding Script

```python
# backend/app/services/watermark.py
import os
import json

SCHOOL_WATERMARK = os.environ.get("SCHOOL_WATERMARK", "dev")
BUILD_ID = os.environ.get("BUILD_ID", "0")


def get_watermark() -> str:
    """Return the school watermark identifier."""
    return SCHOOL_WATERMARK


def watermark_seed_data(db: Session, school_id: str):
    """
    Insert school-specific honeytoken records into seed data.
    These look like real data but are unique per school.
    """
    wm = get_watermark()
    # Honeytoken student
    honeytoken_student = {
        "full_name": f"Test Student {wm}",
        "mother_name": f"Test Mother {wm}",
        "grade": "99",
        "section": "Z",
        "is_honeytoken": True,
    }
    # Only visible to forensic investigation — not in normal UI
    _insert_honeytoken(db, school_id, honeytoken_student)


def watermark_api_header(response, school_id: str):
    """Add watermark to API response headers."""
    # Encrypted: school_id XOR'd with server secret
    response.headers["X-Zenova-Instance"] = _encrypt_watermark(school_id)
    return response
```

### 6.3 Honeytoken Records

```python
# Each school gets unique honeytokens inserted during seeding:
HONEYTOKENS = {
    "alpha-a1b2": {
        "student": "Alpha Test Student X-7",
        "parent": "Parent Alpha-7",
        "invoice": "INV-ALPHA-99999",
        "book_isbn": "978-0-00-000000-0",
    },
    "beta-c3d4": {
        "student": "Test Student Beta-9",
        "parent": "Parent Beta-9",
        "invoice": "INV-BETA-88888",
        "book_isbn": "978-0-00-000001-7",
    },
}

# When a cracked version is found, search for these strings.
# If found → we know which school leaked it.
```

### 6.4 Incident Response Flow

```
1. Cracked version discovered (torrent, forum, etc.)
2. Download & inspect:
   a. Check JS bundle for `__ZENOVA_SCHOOL__`
   b. Check Docker image labels
   c. Check API response headers (if accessible)
   d. Check database dump for honeytoken names
3. Match against HONEYTOKENS dict
4. Identify the school
5. Take action:
   → Revoke license
   → Legal notice
   → Blacklist from updates
```

---

## 7. Feature Locking (Cracked Version)

### 7.1 What Gets Locked

| Feature | Without Valid License | With Valid License |
|---------|----------------------|-------------------|
| NFC Attendance | ❌ Disabled | ✅ Full |
| QR Code Scan | ❌ Disabled | ✅ Full |
| Excel/CSV Import | ❌ Disabled | ✅ Full |
| ID Card Print | ❌ Disabled | ✅ Full |
| Everything Else | ✅ Works (view + basic) | ✅ Full |

### 7.2 Backend Enforcement

```python
# backend/app/api/v1/deps.py

async def require_licensed_feature(feature: str = "default"):
    """
    Dependency: blocks feature if license is invalid/cracked.
    Used in NFC, QR, Import, ID Card endpoints.
    """
    async def _check(current_user=Depends(get_current_user)):
        license_status = get_cached_license_status()
        if not license_status["valid"]:
            feature_restrictions = {
                "nfc": license_status.get("restrict_nfc", True),
                "qr": license_status.get("restrict_qr", True),
                "import": license_status.get("restrict_import", True),
            }
            if feature_restrictions.get(feature, False):
                raise HTTPException(
                    status_code=403,
                    detail="This feature requires a valid license"
                )
    return _check


# Usage in endpoints:
@router.post("/attendance/qr")
def scan_qr(..., _=Depends(require_licensed_feature("qr"))):
    ...

@router.post("/attendance/nfc")
def tap_nfc(..., _=Depends(require_licensed_feature("nfc"))):
    ...
```

### 7.3 Frontend Enforcement

```typescript
// frontend/src/services/license-check.ts
export async function checkFeatureAccess(feature: string): Promise<boolean> {
  try {
    const res = await api.get('/license/feature-access', {
      params: { feature }
    });
    return res.data.allowed;
  } catch {
    return false;
  }
}

// Usage in components:
const [nfcAllowed, setNfcAllowed] = useState(false);

useEffect(() => {
  checkFeatureAccess('nfc').then(setNfcAllowed);
}, []);

// NFC tab only shows if allowed
{nfcAllowed && <NFCTab ... />}
```

### 7.4 License Validation Cache

```python
# backend/app/services/license_cache.py
import redis
from app.core.redis_client import get_redis

CACHE_TTL = 3600  # 1 hour

def get_cached_license_status() -> dict:
    """Get license status from Redis cache (refreshed hourly)."""
    r = get_redis()
    cached = r.get("license:status")
    if cached:
        return json.loads(cached)

    # Refresh from DB
    status = validate_license_at_startup(db)
    r.setex("license:status", CACHE_TTL, json.dumps(status))
    return status


def invalidate_license_cache():
    """Call after license changes (renew, suspend, etc.)."""
    r = get_redis()
    r.delete("license:status")
```

---

## 8. Implementation Order

| Phase | Tasks | Dependencies |
|-------|-------|-------------|
| **Phase 1: PWA** | manifest.json, sw.js, register component, install prompt | None |
| **Phase 2: Docker** | Frontend Dockerfile, root docker-compose, nginx, .dockerignore | None |
| **Phase 3: Ubuntu Deploy** | deploy.sh, systemd service, static IP setup | Phase 2 |
| **Phase 4: License Crypto** | license_crypto.py (RSA keys, fingerprint, .lic files) | None |
| **Phase 5: Watermark System** | watermark.py, honeytokens, 8 embedding locations | Phase 4 |
| **Phase 6: Feature Lock** | require_licensed_feature() dependency, frontend checks | Phase 4 |
| **Phase 7: Distribution** | Docker image build pipeline, .lic file generation, docs | All above |

---

## 9. File Inventory

### New Files to Create

| # | File | Phase | Status |
|---|---|---|---|
| 1 | `frontend/public/manifest.json` | PWA | 🆕 |
| 2 | `frontend/public/icons/icon.svg` | PWA | 🆕 |
| 3 | `frontend/public/sw.js` | PWA | 🆕 |
| 4 | `frontend/src/components/pwa/register-sw.tsx` | PWA | 🆕 |
| 5 | `frontend/src/components/pwa/install-prompt.tsx` | PWA | 🆕 |
| 6 | `frontend/Dockerfile` | Docker | 🆕 |
| 7 | `frontend/.dockerignore` | Docker | 🆕 |
| 8 | `backend/.dockerignore` | Docker | 🆕 |
| 9 | `docker-compose.yml` (root) | Docker | 🆕 |
| 10 | `nginx/nginx.conf` | Docker | 🆕 |
| 11 | `scripts/deploy.sh` | Ubuntu | 🆕 |
| 12 | `backend/app/services/license_crypto.py` | Security | 🆕 |
| 13 | `backend/app/services/watermark.py` | Security | 🆕 |
| 14 | `backend/app/services/license_cache.py` | Security | 🆕 |

### Existing Files to Modify

| # | File | Change |
|---|---|---|
| 1 | `frontend/src/app/layout.tsx` | Add manifest, themeColor, appleWebApp metadata |
| 2 | `backend/Dockerfile` | Non-root user, SCHOOL_WATERMARK arg |
| 3 | `backend/docker-compose.yml` | Remove or deprecate (root compose replaces) |
| 4 | `backend/app/models/license.py` | Add machine_fingerprint, hardware_id, offline_grace_start fields |
| 5 | `backend/app/api/v1/deps.py` | Add require_licensed_feature() dependency |
| 6 | `backend/app/main.py` | Add startup license validation |
| 7 | `frontend/src/middleware.ts` | Allow manifest.json, sw.js, icons/ in public routes |
| 8 | `frontend/next.config.ts` | Add headers for service worker scope |
| 9 | `docs/PROGRESS.md` | Update with new phase status |

---

*End of Plan — Last Updated: 2026-06-23*
