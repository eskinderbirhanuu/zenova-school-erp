# 03 — FRONTEND AUDIT

**Generated:** 2026-07-11  
**Tool:** ZENOVA Master Enterprise Audit

---

## Executive Summary

The ZENOVA frontend is a Next.js 16 App Router application with role-scoped routing, Radix UI + Tailwind CSS v4 + Shadcn components, Recharts for data visualization, and Framer Motion for animations. The architecture follows modern React patterns with middleware-based RBAC, lazy-loaded route segments, and a thin service layer. The frontend is mature and production-ready, though there are areas for improvement in component reuse, accessibility, and bundle optimization.

**Score:** 7.5/10

---

## Current Implementation

### Architecture

```
frontend/src/
├── app/                    # Next.js App Router pages
│   ├── (admin)/            # Admin portal (route group)
│   ├── (auditor)/           # Auditor portal
│   ├── (cafeteria)/         # Cafeteria POS
│   ├── (corporate)/         # Corporate management
│   ├── (director)/          # Director dashboard
│   ├── (finance)/           # Finance portal
│   ├── (hr)/                # HR portal
│   ├── (installer)/         # Server installer UI
│   ├── (inventory)/         # Inventory management
│   ├── (legacy)/            # ? Legacy pages (unclear purpose)
│   ├── (library)/           # Library management
│   ├── (parent)/            # Parent portal
│   ├── (public)/            # Public pages (unauthenticated)
│   ├── (registrar)/         # Registrar portal
│   ├── (student)/           # Student portal
│   ├── (super-admin)/       # Super admin portal
│   ├── (teacher)/           # Teacher portal
│   ├── auth/                # Login, register, forgot/reset password, MFA
│   ├── dashboard/           # Generic dashboard (redirect)
│   ├── parent/              # Parent-specific pages
│   ├── platform/            # Platform admin pages
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Root page (redirect to dashboard or installer)
│   ├── globals.css          # Global styles (Tailwind)
│   ├── error.tsx            # Error boundary
│   ├── loading.tsx          # Loading state
│   └── not-found.tsx        # 404 page
├── components/              # Shared UI components
├── hooks/                   # React hooks
├── lib/utils.ts             # Utility functions (1 file)
├── services/                # API client + auth/setup context providers
│   ├── api.ts               # Axios HTTP client with interceptors
│   ├── auth-context.tsx     # Auth state context provider
│   └── setup-context.tsx    # Setup wizard state context
├── config/                  # App configuration
└── middleware.ts            # Next.js edge middleware (RBAC route guard)
```

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.2.9 | Framework (App Router) |
| react | 19.2.4 | UI library |
| radix-ui | 1.x series | Accessible primitives (dialog, dropdown, select, tabs, toast, avatar, label, separator, slot) |
| tailwindcss | 4.x | Utility CSS |
| recharts | 2.15.0 | Charts |
| framer-motion | 12.40.0 | Animations |
| lucide-react | 1.21.0 | Icons |
| axios | 1.18.0 | HTTP client |
| html5-qrcode | 2.3.8 | QR scanner |
| next-themes | 0.4.6 | Dark/light theme |
| three + @react-three | | 3D rendering |
| class-variance-authority | 0.7.1 | Component variants |
| tailwind-merge + clsx | | Class merging |

### State Management

No third-party state library (Redux, Zustand, Jotai). Uses:
- **React Context**: Two providers — `AuthContext` (auth state) and `SetupContext` (installer wizard)
- **React state**: Local `useState` in components
- **URL/cookies**: Auth tokens via HttpOnly cookies, role via non-HttpOnly cookie
- **Server state**: Direct API calls via Axios (no React Query/TanStack Query caching layer)

### Routing & RBAC (middleware.ts)

Edge middleware runs on every request:
1. Skips `/_next`, `/static`, `/favicon.ico`, image assets
2. On public routes (login, forgot-password, activate, setup), clears old CSRF and sets new one
3. On `/`, checks setup completion → redirects to installer or login/dashboard
4. If no access_token cookie → redirect to `/login`
5. If access_token present → checks `ROLE_PREFIXES[userRole]` → allows access to allowed paths only
6. Redirects unauthorized to `/unauthorized` or role dashboard

**Pattern**: Cookie-based RBAC. The middleware reads `user_role` cookie and checks a static `ROLE_PREFIXES` map. This is a **client-side guard only** — actual authorization is enforced by the backend's `require_permission()`.

### Lazy Loading

Next.js App Router route groups provide automatic code splitting per route segment. Each `(role)` group loads independently. No explicit `React.lazy()` or `dynamic()` imports needed.

---

## Strengths

1. **Role-scoped route groups**: Clean separation — each role has its own `(role)` directory with its own `layout.tsx`. Prevents cross-role page access by URL structure.
2. **Edge middleware RBAC**: Fast path-based role check before any page render. Redirects unauthenticated/unauthorized users before the page loads.
3. **Next.js 16 + React 19**: Modern framework version. App Router with streaming, server components support.
4. **Radix UI + Shadcn**: Accessible component primitives. Keyboard navigation, screen reader labels, focus management built-in.
5. **Tailwind v4**: Utility-first CSS. Consistent design language.
6. **HttpOnly cookies for tokens**: Access/refresh tokens are HttpOnly — inaccessible to JavaScript. Mitigates XSS token theft.
7. **CSRF protection**: Double-submit cookie pattern. Middleware generates CSRF token for public routes, API layer includes it in headers.
8. **Error boundaries**: `error.tsx` for each route group. Graceful degradation.
9. **Loading states**: `loading.tsx` for Suspense boundaries. Good UX pattern.
10. **QR scanner integration**: `html5-qrcode` for in-browser QR scanning. Practical feature.

---

## Weaknesses

1. **No server-state caching layer**: No React Query/SWR. Every page load re-fetches data. Causes waterfalls and redundant network requests. This is the biggest gap.
2. **Thin utility layer**: `lib/utils.ts` is a single file. Most logic likely duplicated across components.
3. **Unknown `(legacy)` route group**: Purpose unclear. Could be dead code. Needs investigation.
4. **RBAC is client-side only in middleware**: The middleware uses a static role→path map and a non-HttpOnly `user_role` cookie. A malicious user could modify the cookie to see different UI, though the backend still enforces real authorization.
5. **No form library**: No React Hook Form, Formik, or similar. Forms likely use manual state management — verbose and error-prone.
6. **`three` + `@react-three` dependencies**: 3D rendering libraries in package.json. Unclear usage — potential bloat if unused or rarely used.
7. **SWC binary incompatibility**: Falls back to WASM compilation. `next dev --webpack` flag needed. Slower builds.
8. **No automated accessibility testing**: No axe-core, pa11y, or jest-axe in dependencies.
9. **No bundle analyzer**: No `@next/bundle-analyzer` configured. Production bundle size unknown.

---

## Issues

### Medium

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| M1 | No React Query caching | app-wide | Every page fetches fresh data. Redundant requests, slower UX, no cache invalidation pattern |
| M2 | `user_role` in non-HttpOnly cookie | middleware.ts:82, auth.py:176 | Role is exposed to JavaScript. Allows client-side UI manipulation. Not a security hole (backend still authorizes) but a UX integrity issue |
| M3 | Thin utility library | `lib/utils.ts` | Single utility file. DRY violations likely across 18+ role page groups |
| M4 | No form management library | app-wide | Manual form state, validation, and submission — error-prone, verbose |
| M5 | SWC WASM fallback | next.config.ts | SWC binary not compatible — slower builds, slower HMR |

### Low

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| L1 | `(legacy)` route group unclear | `app/(legacy)/` | Dead code? Migration remnants? Needs auditing |
| L2 | `three` + `@react-three` usage unknown | package.json | 3D libraries installed. If unused, dead weight (~500KB) |
| L3 | No bundle optimization monitoring | build config | Bundle size, tree shaking, and chunk sizes unknown |
| L4 | No PWA/service worker | public/ | No `sw.js`, no manifest (despite DEPLOY.md mentioning PWA readiness) |
| L5 | `components.json` at frontend root | frontend/ | Shadcn config — expected location |

---

## Recommended Improvements

1. **Add React Query (TanStack Query)**: For server-state caching, deduplication, background refetch, optimistic updates. High impact on UX. Medium effort.
2. **Add React Hook Form**: For form state management with Zod validation. Reduces boilerplate, improves validation consistency. Medium effort.
3. **Audit `(legacy)` route group**: Either document purpose or remove dead code. Low effort.
4. **Move `user_role` to backend-only verification**: Instead of cookie-based role, have backend return role in `/auth/me` and frontend cache in React Context. Low effort, low risk.
5. **Add bundle analyzer**: `@next/bundle-analyzer` to monitor chunk sizes. Low effort, high insight.
6. **Install accessibility testing**: `@axe-core/react` for runtime checks. `jest-axe` for unit test checks. Low effort.
7. **Remove unused 3D dependencies if not used**: Check for Three.js imports. If unused, remove ~500KB from bundle.
8. **Rebuild against compatible SWC**: Docker-based or WSL-based development to use native SWC. Medium effort.

---

## Component Architecture Observations

Based on the documentation (DESIGN.md, DESIGN_SYSTEM.md, COMPONENT_IMPROVEMENTS.md):
- Component library follows Shadcn/ui patterns with Radix primitives
- Forms use custom input components
- Tables use a consistent data-table pattern
- Dashboards use Recharts for bar/line/pie charts
- Responsive design via Tailwind breakpoints (`sm`, `md`, `lg`, `xl`)
- Theme support via `next-themes` (dark/light mode)

No direct component code was audited at the file level (would require >100 component files). The architecture and dependencies indicate a modern, well-structured approach.

---

## Estimated Difficulty

| Fix | Difficulty | Risk |
|-----|-----------|------|
| React Query integration | Medium | Low — additive, doesn't break existing code |
| React Hook Form integration | Medium | Low — additive |
| Legacy route audit | Low | Low |
| Role cookie → context | Low | Low — changes one data source |
| Bundle analyzer | Low | Low |
| Remove Three.js if unused | Low | Low |

---

## Priority

| Priority | Item |
|----------|------|
| P1 (soon) | Add React Query for data caching |
| P2 (later) | Add React Hook Form for form management |
| P2 (later) | Install bundle analyzer, accessibility tools |
| P3 (nice-to-have) | Audit legacy routes, remove unused deps, fix SWC |

---

## Production Readiness: Frontend

**Ready.** The frontend is functionally complete and secure. The biggest gap is the lack of a server-state caching layer, which impacts UX and causes redundant network load. This is not a production blocker but should be addressed before scaling beyond pilot deployment.