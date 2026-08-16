import { CONTROL_CENTER_URL } from "../config/app"

export interface ResolvedSchool {
  name: string
  domain: string
  code: string
  api_url: string
  local_url?: string | null
  local_url_label?: string | null
  branding: {
    logo_url?: string | null
    primary_color?: string | null
    secondary_color?: string | null
    accent_color?: string | null
    tagline?: string | null
  }
  features: Record<string, boolean>
}

export interface ResolveResult {
  found: boolean
  error?: string
  school?: ResolvedSchool
  /**
   * R1: distinguishes transport/config failures (which are *not* "school not
   * found") from an authoritative not-found response:
   *  - "found"      → resolved
   *  - "not_found"  → Control Center responded; code/domain unknown
   *  - "network"    → could not reach the Control Center (offline/DNS/timeout)
   *  - "config"     → no Control Center URL configured at build time
   *  - "invalid"    → empty input
   */
  kind?: "found" | "not_found" | "network" | "config" | "invalid"
}

/**
 * Resolve a school by its ZENOVA school ID (the code/domain prefix, e.g.
 * "omega" or "omega.zenova.et") against the Control Center public API.
 */
export async function resolveSchool(code: string): Promise<ResolveResult> {
  const trimmed = code.trim()
  if (!trimmed) return { found: false, kind: "invalid", error: "code is required" }
  if (!CONTROL_CENTER_URL) return { found: false, kind: "config", error: "no control center configured" }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`${CONTROL_CENTER_URL}/api/v1/public/schools/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: trimmed }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    const body = (await res.json().catch(() => ({}))) as ResolveResult
    if (res.status === 200 && body.found && body.school) {
      return { ...body, kind: "found" }
    }
    return { ...body, found: false, kind: "not_found" }
  } catch {
    return { found: false, kind: "network", error: "resolve failed" }
  }
}

/**
 * R2: probe a candidate local (LAN) endpoint before switching the base URL.
 * Returns the base URL when the server responds 200 to `/api/v1/health/live`,
 * otherwise null. A short timeout keeps the probe from hanging the app.
 */
export async function probeLocalEndpoint(candidateUrl: string, timeoutMs = 2000): Promise<string | null> {
  if (!candidateUrl) return null
  const base = candidateUrl.replace(/\/+$/, "")
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(`${base}/api/v1/health/live`, {
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.ok) return base
    return null
  } catch {
    return null
  }
}

/**
 * R2 base-URL policy: prefer the per-school manual override (SecureStore
 * fallback), then the resolve-driven local_url, then the cloud api_url — but
 * only ever after a successful health probe. Never follows an unprobed URL.
 */
export async function pickBaseUrl(
  school: { api_url: string; local_url?: string | null },
  overrideUrl?: string | null,
): Promise<string> {
  const candidates = [overrideUrl, school.local_url]
  for (const candidate of candidates) {
    if (!candidate) continue
    const reachable = await probeLocalEndpoint(candidate)
    if (reachable) return reachable
  }
  return school.api_url.replace(/\/+$/, "")
}
