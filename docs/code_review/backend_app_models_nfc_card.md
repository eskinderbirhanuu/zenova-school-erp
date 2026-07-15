# File Reviewed

`backend/app/models/nfc_card.py` (29 lines)

## Overview

**DEPRECATED** polymorphic NFC card model. Replaced by per-entity card models (StudentCard, StaffCard, ParentCard, EmployeeCard). Uses `reference_type` + `reference_id` polymorphic pattern.

## Issues

### Issue 1 — Deprecated Model Still in Active Use

- **Lines:** 1-29
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** The model is explicitly marked as deprecated in the docstring and class docstring. However, the table `nfc_cards` still exists in the database.
- **Why it is a problem:** The deprecation has no timeline. Both old and new models exist, creating dual-write concerns. Data could be split across both systems.
- **Potential Impact:** If both systems are active, some cards are in `nfc_cards` and some in `student_cards`, etc. No unified view.
- **Recommended Fix:** Either remove the old model after migration is complete, or add a database view that unifies both.

### Issue 2 — Polymorphic Pattern Lacks Foreign Key Constraints

- **Lines:** 21-22
- **Severity:** Medium
- **Category:** Data Integrity
- **Description:** `reference_type` + `reference_id` is a polymorphic pattern with no FK constraints. `reference_id` doesn't actually reference any foreign table.
- **Why it is a problem:** Cards can reference non-existent entities (orphan records). There's no referential integrity.
- **Potential Impact:** Orphan NFC cards pointing to deleted students or staff.
- **Recommended Fix:** Use separate FK columns per entity type (which the new per-entity models do).

## Security Review

- `card_uid` is unique and indexed — good for lookup.
- No security issues specific to this model.

## Performance Review

- `card_uid` index enables fast lookup — necessary for NFC card swipe operations.

## Maintainability

- Clear deprecation warning in docstring and class docstring.
- The deprecation should progress to removal.

## Architecture Review

- The polymorphic pattern was a reasonable initial design but is being correctly replaced with per-entity models.
- The migration path is documented, which is good practice.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 7/10 |
| Performance | 8/10 |
| Readability | 8/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 5/10 |
