# File Reviewed

`backend/app/core/payment_gateway.py` (166 lines)

## Overview

Payment gateway abstraction layer. Defines `BasePaymentGateway` ABC with dataclass DTOs (PaymentInitResult, TransactionStatus, WebhookResult). Provides `ChapaPaymentGateway` implementation and `PaymentGatewayFactory` registry.

## Issues

### Issue 1 — `ChapaPaymentGateway` Delegates to `chapa_service` Module with Minimal Abstraction

- **Lines:** 71-132
- **Severity:** Medium
- **Category:** Architecture
- **Description:** `ChapaPaymentGateway` is essentially a thin wrapper around `chapa_service` functions. The methods directly call `chapa_service.initialize_payment()`, `chapa_service.verify_transaction()`, etc.
- **Why it is a problem:** The abstraction leaks — adding a new gateway requires implementing the abstract methods, but each implementation must know about the underlying service module's API. The gateway layer doesn't truly abstract away provider differences.
- **Potential Impact:** Adding a new provider (e.g., Telebirr) requires understanding both the ABC interface AND the internal service API.
- **Recommended Fix:** Make the gateway layer fully self-contained — move the HTTP/API logic from `chapa_service` into `ChapaPaymentGateway` itself.

### Issue 2 — `PaymentGatewayFactory._providers` Is a Class-Level Dictionary (Mutable Shared State)

- **Line:** 138
- **Severity:** Low
- **Category:** Architecture
- **Description:** `_providers` is a mutable dict on the class. The `register()` class method mutates it.
- **Why it is a problem:** In testing, providers registered by one test could leak to another test. Also, the singleton state persists across the application lifetime.
- **Potential Impact:** Test pollution — tests that register mock providers could affect subsequent tests.
- **Recommended Fix:** Make `_providers` an instance variable or provide a `reset()` method for testing.

### Issue 3 — `get_gateway_from_session` Uses `getattr` for `session.gateway` with Hardcoded Fallback

- **Lines:** 157-163
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Uses `getattr(session, "gateway", "chapa")` to read the gateway name from a session object. Returns a new gateway instance each time.
- **Why it is a problem:** No caching of the gateway instance. If called multiple times in the same request, a new provider object is created each time.
- **Potential Impact:** Unnecessary object creation, though minimal.
- **Recommended Fix:** Cache the gateway instance on the session object or use a per-request singleton.

### Issue 4 — `ChapaPaymentGateway.__init__` Accepts `db` and `school_id` as Optional Parameters

- **Lines:** 74-76
- **Severity:** Low
- **Category:** Architecture
- **Description:** `ChapaPaymentGateway` stores `db` and `school_id` as instance variables, but these are request-scoped (database session).
- **Why it is a problem:** If the gateway instance is cached beyond a single request, it would hold a stale database session.
- **Potential Impact:** Using a cached gateway instance with an expired DB session would cause errors.
- **Recommended Fix:** Pass `db` and `school_id` as method parameters rather than constructor parameters.

## Security Review

- **Strong points:** ABC interface requires webhook signature verification, which is critical for payment security.
- **Weak points:** No validation that `checkout_url` is HTTPS in `PaymentInitResult`. No HMAC verification of callback URLs.
- **Verdict:** Solid abstraction that correctly identifies the critical security points (webhook verification, transaction verification).

## Performance Review

- Factory creates a new instance per call — no caching concerns.
- Lazy imports inside methods (`from app.services import chapa_service`) add slight overhead.

## Maintainability

- Clean ABC with dataclass DTOs — excellent for type safety.
- Factory registry pattern makes adding new providers straightforward.

## Architecture Review

- Strategy pattern (ABC for gateways) + Factory pattern (registry) — good architecture.
- The thin-wrapper nature of `ChapaPaymentGateway` reduces the value of the abstraction somewhat.
- The separation of `chapa_service` into `services/` while the gateway ABC is in `core/` creates cross-layer coupling.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Performance | 9/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 8/10 |
