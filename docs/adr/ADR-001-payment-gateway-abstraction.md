# ADR-001: Payment Gateway Abstraction

**Status:** Accepted · **Date:** 2026-07-13

## Context

The system uses Chapa as the sole payment gateway. Direct imports of `chapa_service` across multiple endpoints created tight coupling and made it impossible to add alternative gateways without refactoring all callers.

## Decision

Introduce `BasePaymentGateway` (ABC) in `core/payment_gateway.py` with a `ChapaPaymentGateway` adapter. All external code routes through `PaymentGatewayFactory.get_gateway()`. The adapter wraps `chapa_service` internally — no external code imports `chapa_service` directly.

## Consequences

- Adding a new gateway (e.g., Telebirr) requires only a new adapter class
- Existing `chapa_service` functions remain as the low-level implementation
- Factory supports per-school gateway config via `PaymentGatewayConfig` model
