# Security

## Authentication

JWT-based authentication with HttpOnly cookies:
- `access_token`: 30-minute JWT
- `refresh_token`: 7-day JWT for token refresh
- `user_role`: Client-side cookie for frontend routing
- Password hashing via bcrypt (passlib)
- Rate limiting on login endpoint via Redis

### Known Issues
- Token blacklist only used on logout (tokens not invalidated on creation — design choice)
- No MFA/2FA for financial or super-admin access
- No SSO / OAuth integration
- No device/IP binding on sessions

## Authorization (RBAC)

13 roles with role-level permissions:
- Backend: `require_role("ADMIN")` decorator + `PermissionChecker` constants (two systems coexist)
- Frontend: Edge middleware + `RoleLayout` component + route group isolation
- SUPER_ADMIN bypasses all permission checks
- `is_view_only` flag set by network middleware restricts mutations outside school network

### Permission Systems
Two systems coexist but are not unified:
1. `require_role` string-based decorators on endpoints
2. `PermissionChecker` with granular permission codes

## Network Security

### Inside School Network
All authenticated users have **NORMAL ACCESS** based on role permissions.

### Outside School Network
| Role | Inside | Outside |
|------|--------|---------|
| SUPER_ADMIN | Full Access | Full Access (exempt) |
| ADMIN | Full Access | View Only |
| DIRECTOR | Full Access | View Only |
| REGISTRAR | Full Access | View Only |
| TEACHER | Full Access | View Only |
| FINANCE | Full Access | View Only |
| HR | Full Access | View Only |
| INVENTORY | Full Access | View Only |
| LIBRARY | Full Access | View Only |
| CAFETERIA | Full Access | View Only |
| AUDITOR | View Only | View Only |
| PARENT | No Access | Portal Access (cloud) |
| STUDENT | No Access | Portal Access (cloud) |

### View Only Restrictions
- Cannot CREATE, UPDATE, DELETE records
- Cannot access Settings or Approvals
- Can VIEW data and EXPORT reports (read-only)

### IP Range Detection
Checks `X-Forwarded-For` header first, falls back to `request.client.host`. Private ranges: `10.*`, `172.16.*`–`172.31.*`, `192.168.*`, `127.*`.

## CORS Configuration

Single CORSMiddleware using `ALLOWED_ORIGINS` from environment. Restricted to configured origins in production; see `main.py`.

## Data Protection

- PII fields not encrypted or masked in API responses
- No database encryption at rest
- No automated PII purging for soft-deleted records
- CSP allows `'unsafe-eval'`

## Cross-School Data Leak Fixes (Applied June 29)

17 fixes applied across the codebase:
- Added `school_id` column to 21 tables (migration `a7b9c1d2e3f4a5b6`)
- Student document endpoints now filter by `school_id`
- Analytics and dashboard queries scope by school
- Services layer queries filter by `current_user.school_id`

## Feature Locking (Cracked Version)

Without valid license:
- NFC Attendance: ❌ Disabled
- QR Code Scan: ❌ Disabled
- Excel/CSV Import: ❌ Disabled
- ID Card Print: ❌ Disabled
- Everything else: ✅ Works (view + basic)

## Recommendations

1. Implement MFA for financial/super-admin accounts
2. Unify the two permission systems (`require_role` vs `PermissionChecker`)
3. Enable HSTS headers (already sent; needs HTTPS to take effect)
4. Configure SSL/TLS for production
