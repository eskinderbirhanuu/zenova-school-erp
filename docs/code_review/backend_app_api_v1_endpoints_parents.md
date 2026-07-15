# File Reviewed

`backend/app/api/v1/endpoints/parents.py` (216 lines)

## Overview

Parent management — CRUD, smart search (phone, ID, name), linking/unlinking students (with relationship and primary flag), and ID card generation with HTML + CSS (stored XSS protection via `escape`).

## Issues

### Issue 1 — `list_parents` Uses `type(parent_service.Parent)` Instead of Direct Import

- **Lines:** 68-69
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Uses `type(parent_service.Parent)` to access the `Parent` model. Should use a direct `from app.models.parent import Parent` import.

### Issue 2 — `update_parent` Passes `include_deleted=True` to Service

- **Lines:** 113
- **Severity:** Low
- **Category:** Functionality
- **Description:** Allows updating soft-deleted parents. Acceptable for admin recovery.

### Issue 3 — ID Card HTML Uses `escape` Correctly

- **Lines:** 205-213
- **Severity:** Good
- **Category:** Security
- **Description:** All user-controlled fields (`full_name`, `phone_1`, `parent_id`, `school_id`, student names) are HTML-escaped using `html.escape` to prevent stored XSS.

### Issue 4 — ID Card Hardcodes "ZENOVA" Brand and Blue Gradient

- **Lines:** 190-191
- **Severity:** Note
- **Category:** Branding
- **Description:** Hardcoded branding in inline HTML/CSS.

## Security Review

- PARENT_CREATE permission for mutations.
- Smart search respects school_id scoping.
- HTML escaping on ID card prevents XSS.

## Performance Review

- ID card queries parent + linked students — fine for single-parent retrieval.

## Maintainability

- Clean structure.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 8/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 7/10 |
