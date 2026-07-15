# File Reviewed

`backend/app/config.py` (118 lines)

## Overview

Application configuration using Pydantic `BaseSettings` with `.env` file support. Central settings class for database, Redis, JWT, rate limiting, SMTP, backups, and license server configuration.

## Issues

### Issue 1 — Hardcoded Default Database Credentials

- **Line:** 17
- **Severity:** High
- **Category:** Security
- **Description:** Default `database_url` contains hardcoded `zenova_user:zenova_pass` credentials.
- **Why it is a problem:** If the `.env` file is missing, the application will attempt to connect using known default credentials. An attacker who knows this default can attempt to connect.
- **Potential Impact:** Unauthorized database access in development/staging environments where `.env` may be absent.
- **Recommended Fix:** Remove the default value so `database_url` has no default, forcing explicit configuration via `.env`.

### Issue 2 — HS256 Algorithm Default

- **Line:** 20
- **Severity:** Medium
- **Category:** Security
- **Description:** Default JWT algorithm is `HS256`. RS256 support exists (lines 66-67) but is opt-in.
- **Why it is a problem:** HS256 is symmetric — anyone with the secret key can forge tokens. RS256 (asymmetric) allows verification without sharing the signing key.
- **Potential Impact:** If the secret key leaks, all tokens can be forged.
- **Recommended Fix:** Default to `RS256` when `jwt_private_key` and `jwt_public_key` are set, or make RS256 the default.

### Issue 3 — Duplicate Field Declaration

- **Line:** 71
- **Severity:** Low
- **Category:** Code Quality — DRY
- **Description:** `license_offline_grace_days` is declared twice: once at line 35 and again at line 71 with the same default value.
- **Why it is a problem:** Pydantic will raise a `FieldTypeConflict` error for duplicate field definitions.
- **Potential Impact:** Runtime error on settings initialization.
- **Recommended Fix:** Remove the duplicate at line 71.

### Issue 4 — Weak Key Detection Incomplete

- **Lines:** 6-13
- **Severity:** Medium
- **Category:** Security
- **Description:** `KNOWN_WEAK_KEYS` only checks 5 specific strings. Many weak keys could exist.
- **Why it is a problem:** The check is a whitelist of known-bad keys rather than a strength test (length + entropy).
- **Potential Impact:** A user could set a weak key not in the known list and pass validation.
- **Recommended Fix:** Add an entropy check or require minimum complexity beyond length.

### Issue 5 — Global Mutable State Pattern

- **Lines:** 101-118
- **Severity:** Low
- **Category:** Architecture
- **Description:** Uses a module-level `_settings_instance` global with `get_settings()` singleton pattern plus a direct `settings` export.
- **Why it is a problem:** The `settings` object is created at import time, which can be problematic during testing (can't easily override) and creates import-order dependencies.
- **Potential Impact:** Testability issues; settings can't be easily mocked or reloaded.
- **Recommended Fix:** In tests, use `monkeypatch` or a test-specific `.env` file; alternatively, make `settings` lazy via a function call only.

### Issue 6 — `validate()` is Called in `get_settings()` but Not in Direct Instantiation

- **Lines:** 105-115
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `validate()` is called inside `get_settings()` but if someone creates `Settings()` directly, validation is skipped.
- **Why it is a problem:** Inconsistent validation path.
- **Potential Impact:** Settings could be invalid if instantiated directly.
- **Recommended Fix:** Move validation logic into Pydantic's `model_validator` or `__init__` so it always runs.

### Issue 7 — `cookie_secure` Mutable in Production Check

- **Line:** 87
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `validate()` mutates `self.cookie_secure = True` in production. Pydantic fields should generally be treated as immutable.
- **Why it is a problem:** Mutation after initialization is surprising and could interact poorly with Pydantic's validation model.
- **Potential Impact:** Minor — unlikely to cause runtime issues, but violates principle of least surprise.
- **Recommended Fix:** Use Pydantic's `@field_validator` with `mode="before"` to coerce the value during initialization.

### Issue 8 — `build_id` Defaults to "0"

- **Line:** 37
- **Severity:** Low
- **Category:** Configuration
- **Description:** `build_id` defaults to the string `"0"` with no validation or auto-generation.
- **Why it is a problem:** In production, this could make it hard to determine which version is deployed.
- **Potential Impact:** Operational confusion during incident response.
- **Recommended Fix:** Consider reading from a `VERSION` file or `package.json` and requiring explicit setting in production.

## Security Review

- **Strong points:** Known weak key detection, production validation, minimum secret length check (32 chars), `cookie_secure` auto-enable in production, `trusted_networks` for network-level access control.
- **Weak points:** Default DB credentials in source, HS256 default, no TLS enforcement for database URL, backup encryption is opt-in and defaults to disabled.
- **Recommendation:** Remove all default credentials, default to RS256, add TLS enforcement for all external connections.

## Performance Review

- No performance concerns. Configuration is loaded once at startup.
- Singleton pattern is appropriate for configuration.

## Maintainability

- Clean Pydantic v2 patterns (`BaseSettings`, `SettingsConfigDict`).
- Duplicate field (`license_offline_grace_days`) would cause immediate runtime error — needs removal.
- Well-organized into logical groups (database, rate limiting, backup, etc.).
- `KNOWN_WEAK_KEYS` frozenset is a good pattern.

## Architecture Review

- Centralized configuration via Pydantic is the correct enterprise pattern.
- Environment-based configuration via `.env` is standard.
- Singleton with lazy initialization is appropriate for config.
- The `validate()` method being separate from Pydantic's native validation is a minor architectural inconsistency.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 9/10 |
| Security | 7/10 |
| Performance | 10/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 8/10 |
