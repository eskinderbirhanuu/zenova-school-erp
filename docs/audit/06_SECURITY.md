# 06 — SECURITY AUDIT (OWASP)

**Generated:** 2026-07-11
**Tool:** ZENOVA Master Enterprise Audit

---

## Executive Summary

The ZENOVA platform has implemented extensive security measures across the application stack. Most common OWASP Top 10 vulnerabilities are addressed: SQL injection is prevented by SQLAlchemy ORM, XSS is mitigated by CSP headers and HttpOnly cookies, CSRF uses double-submit cookie pattern, SSRF in VPS connect is validated. Several high-severity issues from the 2026-07-06 audit have been resolved. Remaining concerns include QR token not being encrypted, license-server endpoints lacking auth, and the public NFC lookup revealing card existence.

**Score:** 8.0/10

---

## OWASP Top 10 Assessment

### A01: Broken Access Control
**Status: Protected**
- RBAC enforced via `require_permission()` on ~90% of mutation endpoints
- `require_server_role()` for server-level access control
- Cross-tenant guards on card_design, settings, NFC by-card endpoints
- Superadmin bypass via `is_superuser` check
- Frontend middleware provides UI-level route gating
- **Gap**: Bulk NFC assign endpoint lacks permission check (CARD_PRINT/CARD_PRINT_ASSIGN)

### A02: Cryptographic Failures
**Status: Partially Addressed**
- Password hashing: bcrypt with 12 rounds, constant-time comparison
- JWT: HS256 (symmetric). **Missing**: asymmetric RS256/ES256 would add non-repudiation
- QR encrypted_token: **NOT encrypted** — base64(JSON). Reference IDs in cleartext. No HMAC signature.
- NFC card UID: SHA-256 hashed with secret_key salt. Good.
- License keys: RSA-2048 PSS-SHA256 signed. Secure.
- Sync HMAC: SHA-256 with body hash. Good.
- Telegram webhook: HMAC-SHA256 with bot token. Good.
- Chapa webhook: X-Chapa-Signature verification. Good.
- **Gap**: QR token plaintext. No PII encryption at rest.

### A03: Injection
**Status: Protected**
- SQL injection: SQLAlchemy ORM parameterized queries prevent injection. `text("SELECT 1")` used only in health check (no user input).
- XSS: CSP header `script-src 'self'` (production) prevents inline scripts. React auto-escapes JSX output. HttpOnly cookies prevent token theft.
- XXE: No XML parsing in the application. All data exchange is JSON.

### A04: Insecure Design
**Status: Addressed**
- Soft-delete instead of hard delete — recoverable data
- Audit logging on every mutation
- License validation at startup
- Environment detection (VM/docker/bare-metal) for license enforcement
- Grace period for offline use
- **Gap**: No threat model documented. Architecture assumes trusted internal network for school servers.

### A05: Security Misconfiguration
**Status: Protected**
- Production config validation: weak-key rejection, cookie_secure enforcement, Swagger disabled
- Docker: non-root user, multi-stage builds, no-new-privileges
- CSP: strict in production ('self' only), 'unsafe-eval' in dev
- HSTS: max-age=31536000; includeSubDomains; preload
- X-Frame-Options: DENY (API), SAMEORIGIN (nginx frontend)
- Referrer-Policy: strict-origin-when-cross-origin
- **Gap**: License-server CORS had `allow_origins=["*"]` — now resolved (allow_credentials conditional). Verify in deployed instance.

### A06: Vulnerable & Outdated Components
**Status: Acceptable**
- FastAPI 0.115.6, SQLAlchemy 2.0.36, Next.js 16.2.9 — all current
- No known CVEs in direct dependencies (as of audit date)
- `__pycache__/` and `.pytest_cache/` in source tree — weak `.gitignore` hygiene

### A07: Identification & Authentication Failures
**Status: Well Protected**
- See [07_AUTHENTICATION.md](./07_AUTHENTICATION.md) for full details
- Brute-force: per-IP + per-identifier rate limiting with lockout (900s)
- MFA: TOTP with backup codes
- Password policy: 8+ chars, upper+lower+digit+special, common password blocklist
- Refresh token rotation + reuse detection (family invalidation)
- Secure cookie: HttpOnly, SameSite=strict, Secure in production
- Session: implicit (JWT), no server-side session store. Logout blacklists tokens.

### A08: Software & Data Integrity Failures
**Status: Protected**
- Sync: HMAC-signed payloads with body hash + timestamp (60s skew tolerance)
- Chapa webhook: signature verification
- Telegram webhook: HMAC verification
- License: RSA-2048 signed .lic files
- Watermark: forensic watermark on API responses
- C extension: compiled coreval.pyd for anti-tamper
- **Gap**: QR tokens not signed — can be forged. UUID-based validation limits impact but doesn't prevent it.

### A09: Security Logging & Monitoring Failures
**Status: Addressed**
- `log_audit()` on all mutations with user_id, IP, user_agent, old/new data
- `log_security_event()` for login failures, MFA failures, token reuse
- Global exception handler logs all unhandled errors
- Request logging middleware
- Metrics middleware
- **Gap**: No centralized logging aggregation. No SIEM integration. No alerting on security events.

### A10: SSRF
**Status: Protected**
- VPS connect endpoint (`installer.py:53-88`): `_validate_vps_url()` blocks localhost, loopback, private IP ranges, non-http/https schemes
- Rate-limited: 10 requests per 300 seconds
- **Gap**: No circumvention checks for DNS rebinding or IPv6-mapped IPv4

---

## Additional Security Checks

### Security Headers (backend)
| Header | Value | Status |
|--------|-------|--------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | Good |
| X-Content-Type-Options | nosniff | Good |
| X-Frame-Options | DENY (API only) | Good |
| X-XSS-Protection | 1; mode=block | Legacy but present |
| Referrer-Policy | strict-origin-when-cross-origin | Good |
| Permissions-Policy | accelerometer=(), camera=(), microphone=(), geolocation=() | Good |
| CSP (production) | default-src 'self'; script-src 'self'; ...; frame-ancestors 'none' | Good |
| Cache-Control | no-store, no-cache, must-revalidate, private | Good |
| Server | ZENOVA-SECURE | Obfuscated |

### CSRF Protection
- Double-submit cookie pattern
- CSRF token generated by frontend middleware on public routes
- Token sent in `X-CSRF-Token` header, checked against `csrf_token` cookie
- Exempt paths: login, register, forgot-password, reset-password, refresh, setup, activate endpoints
- **Assessment**: Effective against CSRF attacks. Properly implemented.

### Rate Limiting (Redis-backed)
| Limit | Scope | Rate |
|-------|-------|------|
| LOGIN | per-IP | 5 requests / 300s |
| AUTH | per-IP | 10 requests / 60s |
| API | per-IP | 200 requests / 60s |
| INSTALLER_INIT | per-IP | 3 requests / 3600s |
| CONNECT_VPS | per-IP | 10 requests / 300s |
| INSTALLER_STATUS | per-IP | 60 requests / 60s |
| QR_VALIDATE | per-IP | 60 requests / 60s |
| NFC_PUBLIC_LOOKUP | per-IP | 60 requests / 60s |

### Secrets Management
- `.env` file for configuration (not in `.env.example`)
- `MASTER_SETUP_KEY`, `SECRET_KEY`, `SMTP_PASSWORD`, `BACKUP_ENCRYPTION_KEY` — all env-based
- `server_id.json` stores sync_secret on disk — acceptable for server-local config
- `keys/` directory stores RSA key pairs on disk — should be restricted permissions

### Docker Security
- Multi-stage builds (backend + frontend)
- Non-root user (`zenova`, `nextjs`)
- `no-new-privileges:true` on all services
- Healthchecks on all services
- Resource limits (memory + CPU) on all services
- `tmpfs` for `/tmp` on backend
- `read_only: false` on backend (needs write for server_id.json + backups)
- PostgreSQL: `scram-sha-256` auth, healthcheck

### Input Validation Summary
| Input Type | Protection |
|-----------|-----------|
| Request bodies | Pydantic v2 models with type constraints, Field validators |
| Query params | Query(ge=0, le=200) bounds |
| Path params | UUID format or string validation |
| File uploads | UploadLimitMiddleware, SAFE_FILENAME regex for backup downloads |
| URL input (VPS) | `_validate_vps_url()` blocks SSRF vectors |
| Password input | `validate_password_strength()` — length, complexity, blocklist |
| Registration role | SAFE_SELF_REGISTER_ROLES blocklist prevents privilege escalation |

---

## Security Issues

### High (Resolved in Code)
None of the previously-reported Critical/High OWASP issues remain unaddressed:
- ✅ Telegram webhook HMAC (resolved)
- ✅ Sync HMAC body hash (resolved)
- ✅ SSRF in VPS connect (resolved)
- ✅ Installer rate limiting (resolved)
- ✅ NFC UID hashing (resolved)
- ✅ License-server CORS credentials + wildcard (resolved)
- ✅ Global exception sanitizer (resolved)
- ✅ Platform invoice row lock (resolved)
- ✅ Chapa webhook signature (resolved)
- ✅ asyncio.ensure_future crash (resolved)

### Still Open

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| H1 | HIGH | QR token plaintext | `encrypted_token` is base64(JSON) — not encrypted, not signed. Reference ID in cleartext. Forgery limited by UUID discoverability. |
| H2 | MEDIUM | License-server /verify, /activate no auth | Anyone can verify/activate. /generate requires admin auth (resolved). Lower severity since verification only confirms key validity. |
| H3 | MEDIUM | Public NFC lookup enumeration | Returns `known: true/false` — confirms card existence. Should return uniform response. |
| H4 | MEDIUM | No PII encryption at rest | Student/parent PII stored in plaintext in PostgreSQL. Acceptable for school-local server (on-prem). |
| H5 | LOW | JWT HS256 symmetric key | Cannot verify token origin — single shared secret. RS256 would add non-repudiation. |
| H6 | LOW | DNS rebinding SSRF bypass | `_validate_vps_url()` resolves hostname → IP but doesn't re-check post-resolution for DNS rebinding. Very low risk. |
| H7 | LOW | License-server SQLite | Uses SQLite instead of PostgreSQL — acceptable for cloud license server at low scale. |
| H8 | LOW | No client certificate auth | All auth is JWT bearer/cookie. No mTLS. Acceptable for school ERP. |
| H9 | LOW | server_id.json permissions | sync_secret stored on disk — should be 0600 permissions. |

---

## Recommended Improvements

1. **HIGH: Replace QR base64 with HMAC-signed token** — Include reference_type, reference_id, expiry, HMAC-SHA256 with secret_key. Verify signature on validate.
2. **MEDIUM: Add auth to license-server /verify, /activate** — Require API key or JWT for these endpoints.
3. **MEDIUM: Fix public NFC lookup** — Return uniform response regardless of card existence.
4. **LOW: Consider RS256 for JWT** — Asymmetric signing for verifiable token origin.
5. **LOW: Restrict server_id.json permissions** — `chmod 0600` on server_id.json.
6. **LOW: Add DNS rebinding protection** — Resolve URL → IP, then re-check IP against private ranges post-resolution.
7. **LOW: Add centralized logging** — Consider ELK/Loki for log aggregation.

---

## Estimated Difficulty

| Fix | Difficulty | Risk |
|-----|-----------|------|
| QR HMAC signing | Medium | Medium — changes token format |
| License-server auth | Low | Low — additive middleware |
| Public NFC uniform response | Low | Low |
| RS256 JWT | Medium | Medium — changes all token creation/validation |
| DNS rebinding | Low | Low |

---

## Priority

| Priority | Item |
|----------|------|
| P0 (now) | QR token → HMAC-signed |
| P1 (soon) | License-server endpoint auth |
| P1 (soon) | Public NFC lookup anti-enumeration |
| P2 (later) | PII encryption at rest |
| P3 (later) | RS256 JWT, DNS rebinding |

---

## Production Readiness: Security

**Ready with caveats.** Core protections are solid. The QR token gap is the main remaining concern. License-server auth gap is secondary (cloud service, not customer-facing). For on-prem school deployment, the platform is secure enough for production.