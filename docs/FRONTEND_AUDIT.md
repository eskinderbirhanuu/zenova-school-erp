# ZENOVA — Frontend Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 — Senior Frontend Engineer role
**Method:** Static analysis of `frontend/src/`, `frontend/package.json`, `frontend/next.config.ts`, `frontend/middleware.ts`. No code modified.

---

## Executive Summary

ZENOVA's frontend is a **Next.js 16.2.9 + React 19** App-Router application with **role-grouped route groups** `(admin)`, `(teacher)`, `(parent)`, `(public)`, `(super-admin)`, plus a `super-admin` group. Auth is handled correctly via httpOnly cookies + edge-middleware route guard + `RoleGuard` component-level defense-in-depth. The biggest issues are: **no security headers in next.config.ts**, **`localStorage.getItem("access_token")` reads in multiple legacy components point at a cookie that is never set**, **no form-validation library**, and a **non-existent major version of `lucide-react`** that is a supply-chain typo-squat risk.

| Score | Dimension | Notes |
|---|---|---|
| 70/100 | Architecture | Clean App Router, role groupings, defense-in-depth |
| 60/100 | Security headers | None in next.config; Next relies on backend middleware |
| 50/100 | Form validation | No library; HTML `required` only |
| 65/100 | Auth flow | Cookies + edge guard correct; legacy localStorage read bug |
| 55/100 | Performance | Large bundle (Three.js for ERP?), no lazy loading visible |
| 60/100 | Accessibility | Not audited deeply; ARIA props inconsistent in samples |
| 60/100 | Error handling | 401 retry/refresh ✓; 403 not specially handled |

---

## §1 — Architecture

- **Router:** App Router with `frontend/src/app/`. Route-group folders for each role rate-limit at edge and render Role-specific Layouts (14 layouts confirmed).
- **Structure:**
  - `src/app/` — pages
  - `src/components/` — 35 `.tsx`, organized `auth/`, `layout/`, `ui/`, `widgets/`
  - `src/services/` — `api.ts` (axios client + 401-refresh interceptor)
  - `src/contexts/` or `src/lib/` — `auth-context.tsx`, `setup-context.tsx`
  - `src/middleware.ts` — edge route guard
- **State management:** no Redux/Zustand/MobX — only React Context (`AuthContext`, `SetupContext`) and per-page `useState`. This is acceptable for the data-on-demand patterns now, but at scale (parent portal with 5 children / 50 notifications) will become brittle.
- **Data fetching:** No TanStack-Query/SWR — every page calls the API directly inside `useEffect`. No client-side caching, no refetch-on-focus, no optimistic updates.

---

## §2 — Auth Flow & Token Storage

### §2.1 — What's done right

- Tokens stored in **httpOnly cookies** set by backend (`auth.py:158-170`, `auth.py:178-181`). Cookies: `access_token`, `refresh_token` (httponly, SameSite=Strict), `user_role` (httponly=False, intentionally readable by middleware).
- **Edge middleware** (`middleware.ts`) reads cookies and rejects unauthenticated requests. Public routes allowlisted: `/login`, `/forgot-password`, `/activate/*`, `/setup`, `/unauthorized`, `/super-admin/login`.
- **Role prefix RBAC table** (`ROLE_PREFIXES` lines 22-36) maps role → URL prefix. Fail-closed: any new route outside prefixes → 403.
- **`RoleGuard` component** (`auth/role-guard.tsx:18`) wraps each role-group's `layout.tsx` — defense in depth (14 layouts confirmed).
- **Axios interceptor** (`services/api.ts:15-29`) on 401: auto-retries once by calling `/auth/refresh`; on failure → `/login?reason=session_expired`.
- **CSRF double-submit:** cookie + `X-CSRF-Token` header verified server-side by `CSRFMiddleware` (main.py) on mutating methods.

### §2.2 — Bug: localStorage reads that never set

Multiple legacy pages and the notification bell read `localStorage.getItem("access_token")` — but the token is in an httpOnly cookie and **never written to localStorage**. Result: these fetches silently send no auth header, get 401, and use the slow refresh path. Affected components:

- `(legacy)/library/page.tsx:20`
- `(legacy)/cafeteria/page.tsx:19`
- `components/layout/notification-bell.tsx:14`
- `(corporate)/scan-monitor/page.tsx:25`
- Possibly more in `(legacy)` route group.

**Severity:** High (degrades UX, hides bugs under silent 401 refreshes)
**Fix:** Standardize all auth via cookie + axios `withCredentials: true`. Remove all `localStorage.getItem("access_token")` calls.

### §2.3 — Refresh handling

- `withCredentials: true` on axios — cookies attach automatically. ✓
- 401 → 1 retry → on 2nd failure, redirect to login. ✓
- No backoff on 5xx; no automatic retry on network failure.
- **No global 403 handler** — every component shows its own generic error. Users aren't redirected to `/unauthorized`. Inconsistent UX.

---

## §3 — API Client

```typescript
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  withCredentials: true,
});
```

- Base URL env-configurable. ✓
- No auth header is attached manually — relies on cookies.
- Error handling: 401 retry/refresh, 429 console.error, else reject.
- **No 5xx retry or exponential backoff**; users lose work transiently on a backend hiccup.
- **No request cancellation** — slow tab switches fetch-and-discard.

---

## §4 — Route Protection & Permission Enforcement

### §4.1 — Edge middleware (first gate)

`middleware.ts` checks `access_token + user_role` cookies; redirects to login if missing. Public routes do not require cookies. Role→prefix mapping prevents e.g. an `INVENTORY` user reaching `/admin/*`.

### §4.2 — `RoleGuard` (second gate)

Each role-group `layout.tsx` wraps children in `<RoleGuard allowedRoles={[...]}>`. Component renders redirect to `/unauthorized` when user role not allowlisted.

### §4.3 — Per-page permission checks

**Inconsistent.** Some pages render `super-admin`-only actions unconditionally if the user is logged in (sidebar). Sample inventory:

- Role-guard layout: ✓ 14 layouts checked
- Sidebar item visibility: ✓ role-aware
- Inline action buttons: many pages show admin actions to any auth'd user — relies on backend 403 to hide outcomes.

**Recommendation:** add a `usePermission()` hook returning `hasPermission("students.create")` and use it for conditional rendering. Backend remains the source of truth (do not rely on FE for security), but UX improves and 403 storms drop.

---

## §5 — Form Validation

**No form-validation library** (zod / yup / react-hook-form / joi all absent from package.json). All forms use raw `useState` and HTML `required`.

### §5.1 — Sampled forms

| Form | File | Issue |
|---|---|---|
| Public login | `(public)/login/page.tsx:62-78` | Manual `setError`, no email-format check beyond HTML `type="email"`, no min/max length, no disabled-button-during-submit |
| Super-admin login | `(super-admin)/login/page.tsx:18-25` | **`catch { }`** — swallows server error message silently; user sees generic failure, debugging harder |
| Setup wizard / activate | multiple | Not deeply assessed but patterns likely same |

### §5.2 — Recommendation

Add `zod` (Pydantic-aligned schema language, already idiomatic with TS), `react-hook-form` for state mgmt, and one-time schema + error-label components. Even a partial rollout (login + reset + setup) catches the worst UX issues.

---

## §6 — Hardcoded Secrets / .env

- Grep `frontend/src/` and `frontend/*.env*` for `sk-`, `AKIA`, `api_key="..."`, `BEGIN PRIVATE`, `Bearer ` literals: **none found** ✓
- Only public env var: `NEXT_PUBLIC_API_URL` — safe by design
- `.env*` files all git-ignored (`frontend/.gitignore:34`)
- No `.env` tracked in git ✓

**Frontend hygiene:** clean — no secrets in shipped JS.

---

## §7 — `next.config.ts`

```typescript
const nextConfig = {
  output: 'standalone',
  // (no headers, no image domains)
};
```

### §7.1 — Security headers: NONE ❌

- No `Content-Security-Policy`
- No `X-Frame-Options` / `frame-ancestors`
- No `Strict-Transport-Security`
- No `Referrer-Policy`
- No `Permissions-Policy`
- No `X-Content-Type-Options`

The backend emits security headers via `SecurityHeadersMiddleware`. **For same-origin SPA navigation the backend headers apply on document requests** — but Next.js injects resources (chunks, _next/static) on the same origin AND from any embedded 3rd party (-school logos, images) — where the headers do apply, they're helpful. Still — defense in depth recommends adding at the edge (nginx) so that static assets also inherit.

### §7.2 — Image domains: NONE declared

```tsx
<img src={school.logo_url} />     // (public)/login/page.tsx:112
```

Login renders whatever URL is in `school.logo_url` directly with an `<img>` tag. A malicious school admin could set `logo_url` to a tracking pixel or a 3rd-party that logs referrer.

**Severity:** High (SSRF surface + privacy leak)
**Fix:** Use `next/image` with an `images.domains` allowlist; reject arbitrary external sources.

### §7.3 — `output: "standalone"` ✓

For Docker multi-stage build — produces minimal `.next/standalone` snapshot. ✓

---

## §8 — State Management Patterns

| Pattern | Where | Verdict |
|---|---|---|
| AuthContext | global, wraps app | ✓ idiomatic |
| SetupContext | setup/activate wizard flow | ✓ idiomatic |
| Per-page useState + useEffect | 95% of pages | Brittle at scale, no caching, no optimistic updates |
| No SWR / React Query | — | Recommend for parent portal / dashboard |

**Risk:** Parent-portal N+1 client calls (`/parent-portal/dashboard` makes 4 query calls per child). Combined with no client-side cache, every navigation refetches.

---

## §9 — Performance

- **Bundle:** `three`, `@react-three/fiber`, `@react-three/drei`, `framer-motion`, `html5-qrcode`, `lucide-react` (suspicious version — see §10) — large for a school ERP
- **No dynamic imports observed** in sampled list pages — everything statically imported
- **No streaming RSC** (`loading.tsx` Suspense boundaries) spotted in sampled routes
- **Three.js** — used for one or two charts/dashboards; should be lazy-loaded only on those routes

**First contentful paint risk:** likely slow on cold load. Recommend `next bundle-analyzer` and code-splitting Three.js/Framer only to the dashboards that use them.

---

## §10 — Dependencies (`frontend/package.json`)

Package stuck-out risk:

| Package | Declared | Concern |
|---|---|---|
| **`lucide-react`** | **`^1.21.0`** | **NON-EXISTENT major**; current is `lucide-react@0.x`. Either a typo or pulling a typo-squat from npm. **High supply-chain risk.** Replace with `lucide-react@^0.460.0` (or current at audit time). |
| `react@^19.2.4`, `react-dom@^19.2.4` | experimental/unreleased pair with Next 16 | Stable React 19 did not ship 19.2.4 by audit date — verify `react@19.x` stable before deploy |
| `next@16.2.9` | bleeding-edge | Next 16 is pre-release on most package timelines; the `--webpack` flag in scripts confirms Turbopack fallback |
| `three`, `@react-three/fiber` | large | unused-on-most-routes heavy deps |

**No deprecated/react-scripts/CRA or webpack-4 vintage packages** present ✓

---

## §11 — Error Handling

| Status | Behavior |
|---|---|
| 401 | axios interceptor → /auth/refresh → retry once → `/login?reason=session_expired` ✓ |
| 403 | bubbles to component; no global handler; ad-hoc per-page error rendering ❌ |
| 429 | `console.error` only — no user-visible "rate limit" UX ❌ |
| 5xx | rejects promise; per-page shows generic error ❌ |

**Recommendation:** add single global toast/notification + error boundary; redirect 403 to `/unauthorized`; show 429 as "Slow down"; show 5xx as "Server error, retrying…".

---

## §12 — Accessibility

Spot-checks:
- `RoleGuard` buttons have no `aria-label` for redirect action
- Login form lacks `<label>` (uses placeholder only)
- Icon-only buttons (sidebar collapse) lack `aria-label` for screen reader

Not exhaustively audited — recommend a full run with the `accessibility-tester` skill. Pattern suggests moderate a11y gaps.

---

## §13 — Findings Summary

| # | Severity | Finding | File:Line |
|---|---|---|---|
| F1 | **High** | `localStorage.getItem("access_token")` reads — token never written there | `(legacy)/library/page.tsx:20`, `notification-bell.tsx:14`, etc. |
| F2 | **High** | `<img src={school.logo_url}>` arbitrary external origin | `(public)/login/page.tsx:112` |
| F3 | **High** | `lucide-react@^1.21.0` non-existent major — supply chain risk | `package.json:29` |
| F4 | **High** | No security headers in `next.config.ts` (relying on backend only) | `next.config.ts` |
| F5 | **Medium** | No form-validation library | throughout |
| F6 | **Medium** | `catch { }` swallows server error in super-admin login | `(super-admin)/login/page.tsx:18-25` |
| F7 | **Medium** | 403 not specially handled globally | `services/api.ts:13-34` |
| F8 | **Medium** | Heavy Three.js in default bundle with no lazy load | `package.json` |
| F9 | **Low** | No error boundary for whole-app error UI | globally |
| F10 | **Low** | No client-side data cache (no SWR/React Query) | throughout |

---

## §14 — What's Done Well

- **httpOnly cookies** for tokens ✓ (never localStorage)
- **CSRF double-submit** from FE ✓ (X-CSRF-Token header)
- **Edge middleware** at route-level gate ✓
- **RoleGuard component** as second defense ✓ (14 layouts)
- **No committed secrets** ✓
- **App Router** modern ✓ (Next 16)
- **Standalone output** for Docker ✓

**Frontend Score: 62/100** — deduct 25 for the localStorage bug + missing headers + 3rd-party image SSRF + supply-chain risk; deduct 13 for missing form-validation + 5xx/403 UX gaps.

**End of FRONTEND_AUDIT.md**
