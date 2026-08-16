# APU Certificate Trust Policy (LAN)

> **Status:** DESIGN (document only) — nothing here is implemented yet.
> Trust policy for TLS validation when the APU talks to a school's **local LAN
> backend**, which may present a self-signed certificate.

## 1. Principles

1. **Never disable TLS validation app-wide.** A global
   `acceptAllCertificates` / `trustAll` switch is a critical vulnerability and is
   rejected outright. Every connection must present a certificate that the app
   can verify through an explicit, scoped trust path.
2. **Cloud is always validated against the OS trust store.** `api_url` (from
   resolve) is `https://{domain}` served by a publicly-trusted certificate —
   no special handling.
3. **The LAN path is an opt-in, per-school, explicitly-pinned exception** — and
   only for the endpoint the school operator configured as `local_url`. The
   exception must never leak to `api_url` or to any other host.
4. **A real certificate is always preferred.** The policy below only applies
   when the school cannot obtain a publicly-trusted cert for its LAN server.
5. **Credentials are never sent over the pinned path unless the school
   operator chose that endpoint** (existing rule — see `APU_LOCAL_TEACHER_MODE.md`
   §5 and `APU_NETWORK_ARCHITECTURE.md` §4).

## 2. Trust tiers (in order of preference)

| Tier | What it is | TLS validation | When to use |
|---|---|---|---|
| 1 | Publicly-trusted cert on LAN server (Let's Encrypt / school CA that chains to a public root) | OS trust store (default) | Preferred whenever the school can run a domain-validated cert on the LAN box |
| 2 | Per-school **public-key pinning** of a self-signed cert | Validate chain/sig against the pinned SPKI hash recorded in SecureStore | School runs a self-signed cert; operator verifies the fingerprint out-of-band during setup |
| 3 | Plain HTTP **inside a trusted LAN** | None (by definition) | Last resort; visible "unencrypted" warning banner; requires operator to explicitly type `http://` in the manual override and confirm a warning dialog |

Tier 3 exists only for air-gapped schools with no ability to install a
certificate. It is **never** the default and **never** applied to cloud URLs.

## 3. Tier 2 design: per-school public-key pinning

### 3.1 How trust is established (TOFU + out-of-band confirmation)

React Native's `fetch` validates against the OS trust store only; it has no
built-in hook to accept a pinned self-signed cert. Implementing Tier 2 requires
a native networking layer. Two viable options:

- **Option A — `react-native-ssl-pinning`** (OkHttp/URLSession wrappers): set a
  per-request SSL pinning configuration keyed by host. The APU networking layer
  (today `mobile-app/src/services/api.ts` / `auth.ts` `fetch` calls) is already
  centralized, so a thin `httpClient` abstraction can select the pinning config
  per base URL.
- **Option B — custom `URLSession`/`OkHttp` trust manager** holding the pinned
  cert, invoked only for the `local_url` host.

Flow:

1. In `SchoolSelectScreen`, when the operator enters a **`https://` local
   address**, the app connects once (TOFU) and shows the server's
   certificate **fingerprint** (SHA-256 of the SubjectPublicKeyInfo, formatted
   as base64).
2. The operator confirms the fingerprint matches the one printed by the server
   admin (out-of-band — over a different channel than the LAN, e.g. a printed
   handout or a phone call from the school IT person).
3. On confirmation, the app stores `{ host, spki_fingerprint }` in SecureStore
   under the existing per-school key namespace (`zenova.localUrl.<code>`).
4. Every subsequent request to that host validates against the pinned
   fingerprint. Mismatch → **connection refused with an explicit error**
   (never silent fallback to HTTP, never ignore).

### 3.2 What gets pinned

- The **SubjectPublicKeyInfo (SPKI) SHA-256**, not the full certificate. SPKI
  pinning survives certificate renewal with the same key pair, so the school
  can rotate the cert (same key) without re-registering every phone.
- Key-pair rotation: new key pair → new fingerprint → operator must re-register
  each phone (or push a new pin through the SecureStore override flow).

### 3.3 Scope boundaries (mandatory)

- Pinning applies **only** to the exact host:port of the configured `local_url`.
- `api_url` connections never use pinning; cloud certs must chain to the OS
  trust store.
- Pinning config is cleared when the school changes or the session/branding is
  cleared (`clearStoredSchoolUrl`/`setStoredSchoolBranding(null)` already do
  this cleanup — the pin must be stored/cleared with the same lifecycle).

## 4. Tier 3 design: explicit HTTP on a trusted LAN

- The operator types `http://...` in the manual local-address field.
- The app shows a **one-time warning dialog**: "This connection is not
  encrypted. Only use it on a private school network." The choice is stored per
  school (`zenova.localUrl.<code>`).
- The app shows a persistent **"unencrypted" badge** whenever it is connected
  via a Tier-3 base URL.
- Refused automatically when the network is not the LAN (e.g. the app detects a
  non-school Wi-Fi SSID) — SSID allow-listing is a future refinement, documented
  here as a guardrail.

## 5. What is explicitly rejected

- `acceptAllCertificates = true` / any global "trust everyone" toggle.
- Skipping validation silently on mismatch.
- Auto-downgrade `https` → `http` on TLS failure.
- Pinning the cloud host, or applying the LAN exception to `api_url`.
- Trusting any arbitrary LAN host with stored cloud credentials (existing rule).

## 6. Failure modes & UX

| Condition | Behavior |
|---|---|
| Pin mismatch (attacker or rotated key) | Connection refused; explicit "certificate mismatch" error; no fallback |
| Tier 2 host unreachable | Existing `pickBaseUrl` fallback chain (override → local_url → cloud) — see `APU_SCHOOL_RESOLUTION.md` §5 |
| Operator skipped fingerprint confirmation | Pin not stored; HTTPS request proceeds but is treated as Tier 1 (standard OS validation) — which will fail for a self-signed cert, surfacing the normal error |
| Tier 3 HTTP on public Wi-Fi | (Future) refused via SSID allow-list; today a persistent warning badge |
| Cloud cert error | Standard OS validation error; never affected by LAN config |

## 7. Implementation checklist (future — do not fabricate code)

- [ ] Add a centralized `httpClient` abstraction over the existing `fetch`
      calls in `mobile-app/src/services/api.ts` / `auth.ts`.
- [ ] Add native TLS-pinning support (Option A or B) behind a feature flag.
- [ ] Add the TOFU fingerprint display + confirm dialog in `SchoolSelectScreen`
      for `https://` manual entries.
- [ ] Persist `{ host, spki_fingerprint }` in SecureStore keyed by school code;
      clear with the same lifecycle as `zenova.localUrl.<code>`.
- [ ] Add the Tier-3 warning dialog + "unencrypted" badge.
- [ ] Add the SSID allow-list guardrail for Tier 3 (future).

## 8. References

- `APU_LOCAL_TEACHER_MODE.md` §5 (LAN ≠ trusted; never send cloud-only refresh
  tokens to an arbitrary LAN host)
- `APU_SCHOOL_RESOLUTION.md` §5 (resolve-driven `local_url` + manual override)
- `APU_NETWORK_ARCHITECTURE.md` §4 (local network security)
