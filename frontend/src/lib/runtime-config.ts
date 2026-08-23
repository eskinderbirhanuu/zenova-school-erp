// Runtime configuration loader.
// Resolves the API URL at runtime: window.__RUNTIME_CONFIG__ (set by /runtime-config.js,
// editable per-server without rebuilding) > NEXT_PUBLIC_API_URL (build-time) > localhost.
// A relative value like "/api/v1" is supported — it resolves against the page origin
// and works on any server whose nginx proxies /api/v1/ to the backend.

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: { API_URL?: string; APP_MODE?: string }
  }
}

const DEFAULT_URL = "http://localhost:8000/api/v1"
const DEFAULT_MODE = "school"

function runtimeUrl(): string | undefined {
  if (typeof window !== "undefined" && window.__RUNTIME_CONFIG__?.API_URL) {
    return window.__RUNTIME_CONFIG__.API_URL
  }
  return undefined
}

export function getApiUrl(): string {
  return runtimeUrl() || process.env.NEXT_PUBLIC_API_URL || DEFAULT_URL
}

export function getApiOrigin(): string {
  const url = getApiUrl()
  if (!url) return ""
  try {
    return new URL(url).origin
  } catch {
    return ""
  }
}

export function getWsUrl(base: string = getApiUrl()): string {
  const url = base || getApiUrl()
  if (url.startsWith("/")) return url
  return url.replace(/^http/, "ws")
}

/** Server identity: "school" (default) or "org" (Control Center). */
export function getAppMode(): "school" | "org" {
  if (typeof window !== "undefined" && window.__RUNTIME_CONFIG__?.APP_MODE) {
    return window.__RUNTIME_CONFIG__.APP_MODE === "org" ? "org" : "school"
  }
  return DEFAULT_MODE
}

export function isOrgMode(): boolean {
  return getAppMode() === "org"
}