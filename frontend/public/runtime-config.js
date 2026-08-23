// Runtime configuration — edit this file at deploy time without rebuilding.
// Override the API base URL per-server. Relative "/api/v1" resolves against the
// page origin (nginx proxies /api/v1/ to the backend) — works on any server.
//
// APP_MODE declares what this server IS:
//   "school" — School system only: school installer (School ID + License Key),
//              school login, school dashboards. /super-admin/* is blocked.
//   "org"    — ZENOVA Control Center only: org (super-admin) installer, org
//              login + dashboards. School pages/login are blocked.
// The middleware enforces the same via ZENOVA_APP_MODE (server env); this file
// covers client-side reads. Keep both in sync per server.
window.__RUNTIME_CONFIG__ = {
  API_URL: "/api/v1",
  APP_MODE: "school",
}