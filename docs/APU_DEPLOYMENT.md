# APU Deployment

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE — what exists, and the gaps to close before production.

## 1. WHAT exists today (verified)

| Piece | Status |
|---|---|
| Expo app (`mobile-app/`) | Implemented — boot → school → login → MFA → home |
| `expo export` bundle | Verified (599 modules) |
| Debug APK (arm64-v8a) | Built |
| Release APK self-contained build | Done |
| School ERP cloud (VPS) | `deploy.sh school` — verified on Ubuntu VM dry-run |
| Control Center (APU directory + branding) | `deploy/docker-compose.cc.yml` — verified locally |
| License server | Live at Render.com, E2E verified |

## 2. Environment variables (current)

| Env var | Used for | Default in repo |
|---|---|---|
| `EXPO_PUBLIC_CONTROL_CENTER_URL` | school resolve + remote config + directory | empty — **must be set at build** |
| `EXPO_PUBLIC_APP_VERSION` | minimum-version gate | set in `mobile-app/app.json` |

## 3. Build & install pipeline

1. `cd mobile-app && npm ci`
2. `npx expo export` (web/bundle check) or `eas build -p android --profile release` (cloud APK/AAB)
3. `npx cap sync android && cd android && ./gradlew assembleRelease` (self-contained APK, requires Android SDK locally)
4. Distribute APK/AAB (Play Store / internal).

## 4. Runtime configuration (desired — document only)

Per-school endpoint + branding should be **runtime data**, not build-time constants. The app already gets them from `resolve`. What remains is making the resolved data fully effective:

- `branding.logo_url`, colors → theme (already implemented via `themeFromBranding`).
- `features` → role grids already gate menu items.
- APU features should map to the same feature flags the web frontend uses (`/api/v1/config/features`).

## 5. Release management (future)

- Semantic Versioning (MAJOR.MINOR.PATCH) mirrored from `docs/CHANGELOG.md`.
- `minimum_version` in the Control Center remote config forces app updates (already read at boot).
- Signed builds (Play App Signing) — not yet configured.

## 6. Known gaps to close

1. `EXPO_PUBLIC_CONTROL_CENTER_URL` is empty in the repo — set the real URL in the build pipeline (CI secret).
2. Push notification delivery requires FCM + a webhook from the school backend (see `APU_NOTIFICATIONS.md`) — not implemented.
3. Automatic OTA updates / EAS Update — not configured.
4. Test distribution (TestFlight for iOS, internal track) — not configured.
5. Self-signed LAN certificate trust policy — unresolved (see `APU_NETWORK_ARCHITECTURE.md`).
