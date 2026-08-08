/**
 * App-level configuration.
 *
 * The Control Center URL is injected at build time via an EXPO_PUBLIC_ env var
 * (e.g. `EXPO_PUBLIC_CONTROL_CENTER_URL=https://cc.zenova.com` in a .env file
 * in this directory). When empty, the app relies on the bundled fallback data
 * and manual school entry.
 */
export const CONTROL_CENTER_URL = (process.env.EXPO_PUBLIC_CONTROL_CENTER_URL ?? "").replace(/\/+$/, "")

export const isControlCenterConfigured = CONTROL_CENTER_URL.length > 0

export const PARTNERS_FEED_PATH = "/api/v1/public/partners"
export const SCHOOLS_FEED_PATH = "/api/v1/public/schools"

export const FEED_REFRESH_MS = 60 * 60 * 1000 // refresh partner/school feed at most hourly
