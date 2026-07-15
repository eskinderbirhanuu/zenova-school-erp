// Runtime configuration loader.
// Falls back to NEXT_PUBLIC_API_URL (build-time), then to window.__RUNTIME_CONFIG__ (deploy-time).
// This allows changing the API URL without rebuilding the frontend.

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: { API_URL?: string }
  }
}

export function getApiUrl(): string {
  if (typeof window !== "undefined" && window.__RUNTIME_CONFIG__?.API_URL) {
    return window.__RUNTIME_CONFIG__.API_URL
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
}
