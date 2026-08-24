// Runtime configuration for ZENOVA frontend.
// This file is served as-is by nginx (no Next.js processing).
// Override via docker-compose env var ZENOVA_API_URL or nginx config.
// Default: "/api/v1" — works when nginx proxies /api/v1/ to backend.

window.__RUNTIME_CONFIG__ = {
  API_URL: "/api/v1",
  APP_MODE: "school"
}