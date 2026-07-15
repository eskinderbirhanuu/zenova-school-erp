# File Reviewed

`backend/app/models/parent.py` (29 lines)

## Overview

Parent model — stores parent/guardian information including contact details, ID documents (national ID, passport, kebele ID), and links to students via ParentStudentLink.

## Issues

### Issue 1 — ID Document Fields Are Stored Unencrypted

- **Lines:** 19-21
- **Severity:** High
- **Category:** Security
- **Description:** `national_id`, `passport_id`, and `kebele_id` are stored as plain text. These are sensitive government-issued IDs.
- **Why it is a problem:** If the database is breached, parents' national IDs and passport numbers are exposed. This is PII (Personally Identifiable Information) that may be subject to data protection regulations.
- **Potential Impact:** Regulatory non-compliance (Ethiopian data protection law), identity theft risk for parents.
- **Recommended Fix:** Encrypt these fields using AES-256 with an application-level encryption key. Consider column-level encryption or using pgcrypto.

### Issue 2 — `parent_id` Is Nullable

- **Line:** 12
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** `parent_id` (the human-readable ID) is nullable, which means a parent could exist without an identifier.
- **Why it is a problem:** Parents without an ID can't be easily referenced in reports or UI.
- **Potential Impact:** Some parents may be unfindable in the system.
- **Recommended Fix:** Make `parent_id` non-nullable and auto-generate it.

## Security Review

- **Strong points:** Phone and address fields are stored — no encryption needed for those.
- **Weak points:** National ID, passport ID, and kebele ID stored in plain text — this is a data privacy risk.
- **Verdict:** Sensitive ID document storage needs encryption.

## Performance Review

- No performance concerns.

## Maintainability

- Clean model with good field naming.
- Multiple ID document types (national, passport, kebele) — appropriate for Ethiopia.

## Architecture Review

- Links to School and User models.
- Relationship to students is via `ParentStudentLink` (many-to-many link table) — correct.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 5/10 |
| Performance | 10/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
