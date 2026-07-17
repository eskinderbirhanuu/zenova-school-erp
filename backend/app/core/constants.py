"""Centralized constants for the ZENOVA backend.

All hardcoded values that are shared across modules live here.
Values that belong in env config go in ``config.py`` instead.
"""

# ─── Rate Limits ──────────────────────────────────────────────────────
AUTH_RATE_LIMIT_COUNT = 10
AUTH_RATE_WINDOW = 60
LOGIN_RATE_LIMIT_COUNT = 5
LOGIN_RATE_WINDOW = 300
API_RATE_LIMIT_COUNT = 200
API_RATE_WINDOW = 60

# ─── Crypto & Tokens ──────────────────────────────────────────────────
BCRYPT_ROUNDS = 12
PASSWORD_RESET_TOKEN_TTL_MINUTES = 15
MFA_STEPUP_TOKEN_TTL_MINUTES = 5
RECOVERY_CODE_TTL_SECONDS = 600
BACKUP_CODE_COUNT = 10

# ─── WebAuthn ─────────────────────────────────────────────────────────
CHALLENGE_LENGTH = 32
RP_ID = "zenova.local"
RP_NAME = "Zenova School"

# ─── MFA ──────────────────────────────────────────────────────────────
MFA_ISSUER = "ZENOVA"
MFA_REQUIRED_ROLES = frozenset({"SUPER_ADMIN", "FINANCE"})
MFA_VALID_WINDOW = 1

# ─── Heartbeat ────────────────────────────────────────────────────────
HEARTBEAT_INTERVAL_HOURS = 6

# ─── Webhook Retry ────────────────────────────────────────────────────
WEBHOOK_MAX_RETRIES = 3
WEBHOOK_RETRY_DELAYS = [60, 300, 900]

# ─── License & Hardware Fingerprinting ────────────────────────────────
OFFLINE_GRACE_DAYS = 45
FINGERPRINT_MATCH_THRESHOLD = 0.75

# ─── Backup Retention ─────────────────────────────────────────────────
BACKUP_RETENTION_HOURLY = 24
BACKUP_RETENTION_DAILY = 30
BACKUP_RETENTION_WEEKLY = 12

# ─── Upload Limits ────────────────────────────────────────────────────
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

# ─── Card Dimensions ──────────────────────────────────────────────────
CARD_WIDTH_MM = 85
CARD_HEIGHT_MM = 54

# ─── CSRF Exempt Paths ───────────────────────────────────────────────
CSRF_EXEMPT_PATHS = [
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/change-password",
    "/api/v1/auth/verify-reset-token",
    "/api/v1/chapa/webhook",
    "/api/v1/telebirr/notify",
    "/api/v1/setup/init",
    "/api/v1/setup/status",
    "/api/v1/setup/validate",
    "/api/v1/setup/manage",
    "/api/v1/installer/init",
    "/api/v1/installer/status",
    "/api/v1/installer/connect-vps",
    "/api/v1/sync/pull",
]
