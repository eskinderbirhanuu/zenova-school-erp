# File Reviewed

`backend/app/core/upload_limit_middleware.py` (46 lines)

## Overview

Middleware to enforce file upload size (10 MB max) and content-type restrictions on specific upload endpoints.

## Issues

### Issue 1 — Content-Length Header Can Be Spoofed

- **Lines:** 30-35
- **Severity:** Medium
- **Category:** Security
- **Description:** Size check relies solely on the `Content-Length` header, which can be set arbitrarily by the client. An attacker could send `Content-Length: 1` but a body of 100 MB.
- **Why it is a problem:** The size check is a client-trusted value. The actual request body could be much larger, causing memory exhaustion before the middleware can check.
- **Potential Impact:** Memory-based DoS attack by sending a small Content-Length header with a large body.
- **Recommended Fix:** Use FastAPI's `max_size` parameter on `UploadFile`, or add a middleware that reads and limits the request body stream.

### Issue 2 — Content-Type Check Can Be Bypassed With Missing Header

- **Lines:** 36-43
- **Severity:** Medium
- **Category:** Security
- **Description:** If `content-type` header is missing entirely, the `elif content_type` branch is skipped, and the upload proceeds unchecked.
- **Why it is a problem:** An attacker can upload arbitrary file types by omitting the Content-Type header.
- **Potential Impact:** Unrestricted file upload (malicious files, scripts) through upload endpoints.
- **Recommended Fix:** Validate file type server-side (magic bytes) rather than relying on the Content-Type header.

### Issue 3 — `multipart/form-data` Content Type Is Entirely Exempt From Type Checking

- **Lines:** 37-38
- **Severity:** Low
- **Category:** Security
- **Description:** If the content type contains `multipart/form-data`, the type check is skipped entirely (empty `pass` block).
- **Why it is a problem:** Multipart uploads can contain arbitrary file types. The middleware allows all MIME types in multipart requests.
- **Potential Impact:** An attacker could upload a `.exe` or `.html` file as a multipart upload.
- **Recommended Fix:** For multipart uploads, validate each file's content type against `ALLOWED_UPLOAD_TYPES`.

### Issue 4 — Upload Paths Are Hardcoded

- **Lines:** 18-22
- **Severity:** Low
- **Category:** Configuration
- **Description:** Upload paths are hardcoded as a tuple. New upload endpoints require code changes.
- **Why it is a problem:** Developers must remember to add new upload endpoints to this list, or they'll bypass size/content-type checks.
- **Potential Impact:** New upload endpoints may be unprotected if developer forgets to update the list.
- **Recommended Fix:** Use a centralized upload configuration or an `@requires_upload_validation` decorator on endpoints.

## Security Review

- **Strong points:** 10 MB size limit prevents large file uploads, allowed content types restrict uploads to necessary formats.
- **Weak points:** Content-Length header can be spoofed, Content-Type can be omitted, multipart uploads are unchecked.
- **Verdict:** Basic protection that can be bypassed. Not a replacement for server-side file type validation.

## Performance Review

- Header-based checks are fast (no body reading).
- Actual body size isn't checked until FastAPI reads the upload, which could be too late.

## Maintainability

- Simple, clear middleware.
- Hardcoded paths need maintenance.

## Architecture Review

- Middleware is the correct layer for cross-cutting upload limits.
- Server-side magic byte validation (python-magic or file command) should supplement the header-based checks.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 5/10 |
| Performance | 9/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 5/10 |
