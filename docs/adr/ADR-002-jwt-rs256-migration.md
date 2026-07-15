# ADR-002: JWT RS256 Migration

**Status:** Accepted · **Date:** 2026-07-13

## Context

JWT tokens were signed with HS256 (symmetric) using `SECRET_KEY`. This means any service that knows the secret key can both sign and verify tokens — problematic for microservices that only need verification.

## Decision

Support RS256 (asymmetric) when `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` env vars are set. HS256 remains the default for backward compatibility. `decode_token()` tries RS256 first, falls back to HS256.

## Consequences

- Tokens issued with RS256 can be verified by services holding only the public key
- Existing HS256 tokens remain valid until they expire
- Deployment must generate an RSA key pair for RS256 activation
