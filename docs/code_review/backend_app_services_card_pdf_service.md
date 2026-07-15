# File Reviewed

`backend/app/services/card_pdf_service.py` (243 lines)

## Overview

Card PDF generation service — creates printable ID cards (front/back) using ReportLab for student, staff, parent, and employee card types. Supports custom school logos, tier badges, emergency info, and QR placeholders.

## Issues

### Issue 1 — Logo URL Loaded via `ImageReader` With No Validation

- **Lines:** 26-32
- **Severity:** Medium
- **Category:** Security
- **Description:** `ImageReader(logo_url)` can load from any URL or file path. No validation that the URL is a valid image or within expected scope.
- **Why it is a problem:** SSRF risk — an attacker could provide a URL pointing to an internal service (e.g., `http://localhost:5432`) or a very large image that exhausts memory.
- **Potential Impact:** Server-side request forgery or memory exhaustion.
- **Recommended Fix:** Validate the URL scheme (only `https://`), check file extension, add size limit, or download and validate before passing to ImageReader.

### Issue 2 — Text Truncation Without Warning

- **Lines:** 68, 77, 80, 83
- **Severity:** Low
- **Category:** Functionality
- **Description:** Long names and school names are truncated (e.g., `school_name[:30]`, `full_name[:28]`). No indication that truncation occurred.
- **Why it is a problem:** A name like "Abebech Gobena Belachew" might be displayed as "Abebech Gobena Belache" — incomplete and unprofessional.

### Issue 3 — No QR Code, Just Placeholder Rectangle

- **Lines:** 111-116
- **Severity:** Medium
- **Category:** Functionality
- **Description:** The card back has a placeholder "QR Code" box — no actual QR code is generated.
- **Why it is a problem:** The card PDF doesn't include a scannable QR code, defeating a key purpose of printed cards.
- **Potential Impact:** Cards need to be reprinted when QR functionality is added.

### Issue 4 — `_get_person_info` N+1 Queries

- **Lines:** 135-206
- **Severity:** Low
- **Category:** Performance
- **Description:** Multiple individual queries per person (card → student → school, or card → staff → user → school). Could be optimized with joins.
- **Why it is a problem:** Minor performance overhead for bulk card generation.

## Security Review

- School_id scope is respected when provided.
- SSRF risk via `ImageReader(logo_url)` — see Issue 1.
- No sensitive data in PDF.

## Performance Review

- PDF generation is CPU/memory-intensive — acceptable for on-demand per-card generation.
- N+1 queries add overhead.

## Maintainability

- Well-organized drawing functions with clear separation of front/back.
- Person info resolution is well-structured per card type.

## Architecture Review

- Card design service provides customizability.
- The placeholder QR code indicates incomplete feature.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 6/10 |
| Performance | 6/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
