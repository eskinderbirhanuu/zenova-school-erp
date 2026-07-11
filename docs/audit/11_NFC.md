# 11 — NFC & QR AUDIT

**Generated:** 2026-07-11
**Tool:** ZENOVA Master Enterprise Audit

---

## Executive Summary

ZENOVA supports NFC card-based identity for students, staff, parents, and corporate employees, with QR codes as fallback. NFC v2 implements card UID hashing (SHA-256 salted), per-tenant filtered lookups, scan logging, card printing workflow, public lookup (rate-limited, minimal PII), PDF card generation, and QR codes for card verification. QR tokens for attendance/identity use base64-encoded JSON (not encrypted). Several architectural gaps remain: card tables lack school_id, per-table uniqueness allows cross-table collisions, and QR tokens lack cryptographic signing.

**Score:** 6.5/10

---

## Current Implementation

### NFC Card Architecture (v2)

**4 Card Tables** (one per entity type):
```
student_cards ←→ students
staff_cards ←→ staff_profiles  
parent_cards ←→ parents
employee_cards ←→ corporate_employees
```

Each card has:
- `id`: UUID PK
- `card_uid`: SHA-256 hash of raw NFC UID (salted with SECRET_KEY) — **resolved (was plaintext)**
- `card_tier`: standard/premium
- `status`: active/lost/replaced/revoked
- `issue_date`, `expiry_date`
- `student_id`/`staff_profile_id`/`parent_id`/`employee_id`

**Hashing**: `hash_card_uid(raw_uid)` → `SHA-256(raw_uid:SECRET_KEY)`. Salted hash prevents rainbow table lookups even if DB is breached.

### Card Lifecycle

| Operation | Permission | School-aware |
|-----------|-----------|-------------|
| Student assign | STUDENT_CREATE | service looks up student.school_id for audit |
| Staff assign | STAFF_CREATE | service looks up staff_profile.school_id for audit |
| Parent assign | PARENT_CREATE | service looks up parent.school_id for audit |
| Employee assign | CARD_PRINT_ASSIGN | ❌ no school_id (corporate global) |
| Bulk assign | Depends(get_current_user) only | ⚠️ MISSING RBAC |
| Scan | Depends(get_current_user) | Searches all 4 tables, returns first match |
| By-card lookup | Depends(get_current_user) | ✅ filtered by current_user.school_id |
| Status update | CARD_PRINT_ASSIGN | ✅ |
| Print request | CARD_PRINT | ✅ school_id passed |
| Print process | CARD_PRINT | ✅ |
| Card PDF | Depends(get_current_user) | ✅ school_id passed |
| Card QR PNG | Depends(get_current_user) | ✅ |
| Public lookup | No auth (rate-limited) | Returns minimal info (known/not, contact) |
| Scan logs | AUDIT_VIEW | ✅ school_id filtered |

### Scan Flow

```python
scan_nfc(db, card_uid_hash, scan_type, reader_location):
    1. Lookup card_uid_hash in student_cards → return student info
    2. Lookup in staff_cards → return staff info
    3. Lookup in parent_cards → return parent info
    4. Lookup in employee_cards → return employee info
    5. Returns first match (student wins tie)
    6. Creates NfcScanLog entry
    7. Triggers scan_event_manager (attendance, cafeteria, etc.)
```

**asyncio.ensure_future crash risk**: RESOLVED. Now uses `try: loop = asyncio.get_running_loop(); loop.create_task()` pattern with RuntimeError catch.

### Card Printing Workflow

```
CardPrintRequest (pending)
  → Card Officer processes (approved/printed)
    → PDF generated via card_pdf_service
      → Downloaded by user
```

### QR Code System

| Function | Description |
|----------|-------------|
| `generate_qr()` | Creates QRCode row with UUID + encrypted_token |
| `validate_qr(uuid)` | Looks up by UUID, checks is_active + expires_at |
| `get_qr_by_reference()` | Finds existing QR for entity |
| `get_qr_history()` | Lists recent QR codes |

**encrypted_token**: `_generate_encrypted_token()` creates `base64(JSON{type, id, nonce, ts})`. The function is named "encrypted" but uses base64 — NOT encrypted, NOT signed. Comment in `_decrypt_token`: "simple base64 for now."

### NfcScanLog

| Column | Detail |
|--------|--------|
| card_uid | SHA-256 hashed |
| scan_type | attendance, cafeteria, entry, etc. |
| reader_location | device/location |
| user_id, school_id | nullable — populated on internal scans |

---

## Strengths

1. **UID hashing**: SHA-256 salted with SECRET_KEY — resolved from prior plaintext issue. Prevents raw UID enumeration.
2. **Per-tenant filtered lookups**: By-card endpoints filter by `current_user.school_id` — resolved from prior audit.
3. **Permission-gated assign**: Each assign type has appropriate permission — student=STUDENT_CREATE, staff=STAFF_CREATE, parent=PARENT_CREATE, employee=CARD_PRINT_ASSIGN.
4. **Public lookup minimal PII**: Returns only `known: true/false` + generic school contact. Rate-limited (60/min).
5. **Scan logging**: Every scan creates NfcScanLog with hashed UID, timestamp, scan type, reader location.
6. **Card printing workflow**: Full request→process→PDF pipeline.
7. **Card PDF generation**: Professional printable cards with dynamic design template.
8. **Card QR codes**: Alternative verification method for phones without NFC readers.
9. **Status management**: lost/replaced/revoked states.
10. **QR expiry check**: `expires_at` checked on validate. Expired QR codes rejected.

---

## Weaknesses

1. **NFC card tables lack school_id**: No tenant isolation column. Cross-tenant UID collisions possible at DB level. Service functions resolve school_id from referenced entity for audit only — not for data isolation.
2. **Card UID uniqueness is per-table only**: Same `card_uid` hash can exist in `student_cards` AND `staff_cards` simultaneously. `scan_nfc()` returns first match — data integrity issue for scan-based attendance/cafeteria.
3. **QR token is plaintext base64**: NOT encrypted. Reference ID (UUID) in cleartext. No HMAC signature. Forgery possible but limited by UUID knowledge.
4. **QR validate uses UUID lookup, not signature**: Token payload never verified — only UUID is checked. Token forgery would fail because UUID must exist in DB, but a forged `reference_id` in base64 could spoof lookup.
5. **Bulk assign lacks RBAC**: `Depends(get_current_user)` only — any authenticated user can bulk-assign any card type.
6. **Employee cards lack school_id**: Corporate employees are global — intentional but card assignment has no cross-company isolation at card level.
7. **Scan returns first match (student priority)**: In a collision scenario where same UID is assigned to both a student and a staff member, scan will always return the student. Staff card becomes unusable.
8. **Public NFC lookup reveals existence**: Returns `known: true/false` — confirms whether card is registered. Should return uniform response.

---

## Issues

### Critical

| # | Issue | Detail |
|---|-------|--------|
| C1 | Card tables missing school_id | Cross-tenant collisions at DB level. No per-tenant isolation enforcement. |
| C2 | QR token plaintext | base64(JSON) called "encrypted". No encryption, no HMAC signature. Forgery possible. |

### High

| # | Issue | Detail |
|---|-------|--------|
| H1 | Card UID uniqueness per-table only | Same UID can be student AND staff. scan_nfc() returns ambiguous (student wins). |
| H2 | Bulk assign no RBAC | Permission-gated individually but bulk endpoint has none. |

### Medium

| # | Issue | Detail |
|---|-------|--------|
| M1 | Employee cards no school_id | Inherited from corporate model being global — acceptable but noted |
| M2 | Public lookup enumeration risk | Returns `known: true/false` — card existence confirmed |
| M3 | Scan picks student first | Priority order hardcoded. Collision resolution unclear to user |
| M4 | QR validate bypass | UUID matches DB but token payload unchecked. `reference_id` in token could differ from DB record |

### Low

| # | Issue | Detail |
|---|-------|--------|
| L1 | NfcScanLog.school_id nullable | Some scan contexts don't populate school_id |
| L2 | No bulk scan endpoint | Single scan per request — no batch scanning for attendance |
| L3 | No card read range/direction logging | Scan log lacks signal strength or read attempt details |
| L4 | QRCode.reference_id in cleartext | Student UUID visible in QR token payload |

---

## Recommended Improvements

1. **CRITICAL: Add school_id to all 4 NFC card tables** — Migration + backfill from referenced entity. Add composite unique (school_id, card_uid) per table.
2. **CRITICAL: Replace QR base64 with HMAC-signed token** — Sign payload with SECRET_KEY. Verify signature on validate. Include expiry in signed payload.
3. **HIGH: Cross-table card UID uniqueness check** — Before assigning, check ALL 4 tables for existing UID hash under same school_id. Raise duplicate error.
4. **HIGH: Add permission check to bulk assign** — Validate each card type's permission individually.
5. **MEDIUM: Public NFC lookup uniform response** — Always return similar response, regardless of whether card exists.
6. **MEDIUM: Add card collision resolution** — If scan finds UID in multiple tables, return all matches (not just first) or flag as collision.
7. **LOW: Add batch scan endpoint** — Array of UIDs → array of results. For classroom attendance.

---

## Estimated Difficulty

| Fix | Difficulty | Risk |
|-----|-----------|------|
| Card tables school_id | Medium | Low — additive column |
| QR HMAC signing | Medium | Medium — changes token format |
| Cross-table UID check | Low | Low — app logic |
| Bulk assign RBAC | Low | Low |

---

## Priority

| Priority | Item |
|----------|------|
| P0 (now) | Card tables add school_id |
| P0 (now) | QR token → HMAC-signed |
| P1 (soon) | Cross-table UID uniqueness check |
| P1 (soon) | Bulk assign RBAC |
| P2 (later) | Public NFC uniform response |
| P3 (later) | Batch scan, collision resolution |

---

## Production Readiness: NFC

**Not ready for multi-tenant production.** The card table school_id gap and cross-table uniqueness issue are production blockers. For single-school pilot deployment, the system is functional but the QR token gap should be closed before any PII-bearing QR codes are issued.