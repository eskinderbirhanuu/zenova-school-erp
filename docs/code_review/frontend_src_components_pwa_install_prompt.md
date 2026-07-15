# File Reviewed

`frontend/src/components/pwa/install-prompt.tsx` (67 lines)

## Component

- `PWAInstallPrompt` — PWA install prompt using `beforeinstallprompt` event with dismiss tracking.

## Issues

### Issue 1 — Good PWA Install Pattern

- **Lines:** 11-32
- **Severity:** Good
- **Category:** Architecture
- **Description:** Captures `beforeinstallprompt` event, shows install UI, dismisses permanently.

### Issue 2 — `any` Cast on Deferred Prompt

- **Lines:** 23-24
- **Severity:** Low
- **Category:** Type Safety
- **Description:** `deferredPrompt` typed as `Event | null` but cast to `any` for `.prompt()` and `.userChoice`.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
