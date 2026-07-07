# ZENOVA Master Task List

> Generated: 2026-07-05 | Priority: P0 (Critical) → P3 (Low)
> Status: 🟢 Done | 🟡 In Progress | ⚪ Pending | 🔴 Blocked

---

## P0 — Critical (Must Fix Before Launch)

### Payment System — Backend Bugs (🟢 Fixed)
| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | Fix `.Relationship()` → `.filter()` typo (crashes invoice query) | `parent_payment_service.py:61` | 🟢 |
| 2 | Fix `" anchored_amount"` → `"amount"` (leading space breaks API consumers) | `parent_payments.py:239` | 🟢 |
| 3 | Fix `status_code=10` → `status_code=500` (invalid HTTP status) | `parent_payments.py:309` | 🟢 |
| 4 | Fix `callback_url: merchant_callback_url: str` syntax error | `chapa_service.py:39` | 🟢 |
| 5 | Fix webhook handler `async` — `request.body()`/`request.json()` need `await` | `parent_payments.py:153-190` | 🟢 |
| 6 | Create missing `app/core/notifications.py` module | `core/notifications.py` | 🟢 |
| 7 | Replace `_verify_chapa_signature` always-returns-True placeholder with field validation | `parent_payment_service.py:290` | 🟢 |

### Payment System — Remaining Critical Bugs (⚪ Pending)
| # | Task | File(s) | Priority |
|---|------|---------|----------|
| 8 | **Fix callback URL**: `settings.license_server_url` → school-specific host. Chapa webhooks currently route to `superadmin.free.nf` instead of the school's actual server. Must be configurable per-school or auto-detected from request. | `parent_payments.py:135` | P0 |
| 9 | **Payment model missing `parent_id`**: Refund `request_refund()` uses `hasattr(payment, 'parent_id')` which is always False since `Payment` table has no `parent_id`. Refunds never link back to parent. Fix: add `parent_id` FK to `Payment` model or derive from `PaymentSession`/`Receipt`. | `payment.py`, `parent_payment_service.py:412` | P0 |
| 10 | **Missing Alembic migrations**: Models `payment_session`, `receipt`, `receipt_line`, `refund` exist but no migration files created. Tables may not exist in production DB. | New migration files | P0 |
| 11 | **Chapa secret key from env only**: Uses `os.getenv("CHAPA_SECRET_KEY")` directly — no DB fallback for per-school Chapa accounts. Multi-school deployments will fail. | `chapa_service.py:15-16` | P0 |

### Security — Anti-Piracy Hardening (⚪ Pending)
| # | Task | Dependencies | Priority |
|---|------|-------------|----------|
| 12 | **Compile `coreval.c` → `.pyd`** (🔴 Blocked: MSVC 14.44 available but OpenSSL headers missing. Need `vcpkg install openssl` or pre-built binaries) | OpenSSL dev headers | P0 |
| 13 | **Implement HW fingerprint binding** at license verification (8-component, 75% tolerance) | #12, `db/school.hardware_fingerprint` | P0 |
| 14 | **Implement license server heartbeat** — periodic validation calls from school servers | #12, `services/heartbeat.py` | P0 |

---

## P1 — High Priority (Next Release)

### Payment System Features
| # | Task | File(s) |
|---|------|---------|
| 15 | **Implement PDF receipt generation** with ReportLab/WeasyPrint (currently plain-text placeholder) | `receipt_service.py:114-139` |
| 16 | **Add admin permission check** on `approve_refund_endpoint` | `parent_payments.py:278` |
| 17 | **Add finance permission check** on `process_refund_endpoint` | `parent_payments.py:297` |
| 18 | **Implement notification module** — SMS (Africa's Talking/AfroMessage), Email (SMTP), Push (FCM) | `core/notifications.py`, `parent_payments.py:312-315` |
| 19 | **Wire parent payment frontend** — pages: `parent/receipts/page.tsx`, `parent/pay/success/page.tsx`, `parent/pay/failed/page.tsx` | `frontend/src/app/parent/` |
| 20 | **Fix `process_refund` not updating receipt status** — refund should mark receipt as `cancelled` | `parent_payment_service.py:444-469` |
| 21 | **Add `school_id` filter to `get_parent_dashboard`** — currently filters invoices but not payments by school | `parent_payment_service.py:135-138` |

### Security & Stability
| # | Task | File(s) |
|---|------|---------|
| 22 | **Audit 13 silent `except Exception: pass` sites** — classify each as intentional fallback vs bug-hiding | 13 files (see `docs/project_management/STUBS_AND_TODOS.md`) |
| 23 | **Add idempotency key enforcement** for Chapa initialize to prevent double-charges | `chapa_service.py`, `payment_session.py` |
| 24 | **Implement webhook retry with dead-letter queue** for failed Chapa webhooks | `parent_payments.py` |
| 25 | **Add Chapa test mode toggle** (sandbox vs live API URL) | `chapa_service.py`, `settings.py` |

### Cross-Cutting
| # | Task | File(s) |
|---|------|---------|
| 26 | **Create CI/CD pipeline** (GitHub Actions: lint → test → build → deploy) | `.github/workflows/` |
| 27 | **Add pytest-cov coverage** — target 60%+ for critical paths | `pyproject.toml`, `conftest.py` |
| 28 | **Write unit tests for payment flow** — mock Chapa, test session creation, webhook handling, refund workflow | `tests/` |

---

## P2 — Medium Priority (Sprint+1)

| # | Task | Notes |
|---|------|-------|
| 29 | Payment reconciliation report (daily summary of Chapa vs local records) | `services/reporting.py` |
| 30 | Add `app/core/__init__.py` for explicit package exports | All core modules |
| 31 | Refactor `chapa_service.py` to class-based with per-school API keys | Multi-school support |
| 32 | Add payment session cleanup cron (expire stale sessions >24h) | `scheduler.py` |
| 33 | Add partial payment support in UI (pay less than full invoice) | `parent_payments.py` |
| 34 | Add payment method logos and gateway selection UI | Frontend |
| 35 | Implement `watermark_seed_data()` for all new school setups | `watermark.py` |
| 36 | Add invoice auto-generation when new student enrolls | `services/invoicing.py` |

---

## P3 — Low Priority (Backlog)

| # | Task | Notes |
|---|------|-------|
| 37 | Payment analytics dashboard (revenue trends, gateway success rates) | Frontend + API |
| 38 | Multi-currency support (USD, KES, UGX beyond ETB) | `payment_session.py` |
| 39 | Payment installment plans (monthly, quarterly) | `models/installment.py` |
| 40 | Bulk invoice creation from CSV/Excel | `utils/excel.py` |
| 41 | Email receipt delivery as PDF attachment | `receipt_service.py` |
| 42 | Refund to original payment method (automatic) | `chapa_service.py` transfer |
| 43 | SMS payment reminders before due date | `scheduler.py` + `communication_service.py` |
| 44 | Payment gateway failover (Chapa → LPesa → manual) | `parent_payment_service.py` |

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 | 14 tasks | 🟢 7 done, ⚪ 5 pending, 🔴 1 blocked (coreval.c) |
| P1 | 13 tasks | ⚪ 13 pending |
| P2 | 8 tasks | ⚪ 8 pending |
| P3 | 8 tasks | ⚪ 8 pending |
| **Total** | **43 tasks** | **🟢 7 / ⚪ 35 / 🔴 1** |

## Quick Wins (Do These First)
1. #8 — Fix callback URL (1-line config change)
2. #9 — Add `parent_id` to `Payment` model + migration
3. #16 + #17 — Add permission checks (FastAPI dependency, ~10 lines each)
4. #21 — Add `school_id` filter to payment query
5. #26 — Create `.github/workflows/ci.yml` (20 lines)
