# Security Gaps Audit

## Summary
ZENOVA has a solid security foundation with bcrypt password hashing, JWT tokens, CSRF protection, rate limiting, and brute-force protection. Several gaps remain around MFA enforcement, secret management, and input validation.

## Existing Features
- bcrypt with 12 rounds for password hashing
- JWT access/refresh tokens with type enforcement
- CSRF double-submit cookie pattern
- Rate limiting per IP (Redis-backed)
- Brute-force protection per IP and per identifier
- Security headers (HSTS, CSP, X-Frame-Options)
- Password strength validation
- Token blacklisting on logout
- Role-based access control
- Tenant isolation via school_id

## Missing Features
- **MFA enforcement by role**: `mfa_required_for_role()` exists but not enforced at login
- **Hardware security module (HSM)**: No HSM for license key signing
- **Secrets rotation**: No automatic rotation of DB credentials or API keys
- **WAF integration**: No Web Application Firewall
- **DDoS protection**: No Cloudflare/AWS Shield integration
- **PII encryption at rest**: National IDs, medical notes stored in plaintext
- **Row-level security**: No PostgreSQL RLS policies
- **Security scanning**: No SAST/DAST in CI/CD
- **Dependency scanning**: No automated vulnerability checks
- **Penetration testing**: No scheduled pentest program

## Risks
| Risk | Severity | Description |
|------|----------|-------------|
| MFA not enforced | High | Finance/SuperAdmin can skip MFA setup |
| PII plaintext | High | National IDs, medical notes unencrypted |
| Default SECRET_KEY | Medium | Weak key warning but not blocked in dev |
| X-Forwarded-For trust | Medium | IP spoofing possible if not behind proxy |
| No WAF | Medium | No protection against common web attacks |
| File upload limits | Medium | No size/type validation on uploads |
| Audit log commits early | Medium | `log_audit()` calls `db.commit()` breaking atomicity |

## Recommendations
1. Enforce MFA for SUPER_ADMIN, ADMIN, FINANCE roles at login
2. Implement column-level encryption for PII (PGcrypto or app-layer)
3. Add PostgreSQL Row-Level Security policies
4. Integrate Snyk/Dependabot for dependency scanning
5. Add file upload size/type validation
6. Fix `log_audit()` to not commit inside caller transactions
7. Add WAF rules (ModSecurity or cloud provider WAF)

## Estimated Development Effort
- **High**: 3-4 weeks for PII encryption + MFA enforcement
- **Medium**: 2 weeks for WAF + security scanning
- **Low**: 1 week for file upload validation
