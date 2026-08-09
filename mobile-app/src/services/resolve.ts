import { CONTROL_CENTER_URL } from "../config/app"

export interface ResolvedSchool {
  name: string
  domain: string
  code: string
  api_url: string
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
}

/**
 * Resolve a school by its ZENOVA school ID (the code/domain prefix, e.g.
 * "omega" or "omega.zenova.et") against the Control Center public API.
 */
export async function resolveSchool(code: string): Promise<ResolveResult> {
  const trimmed = code.trim()
  if (!trimmed) return { found: false, error: "code is required" }
  if (!CONTROL_CENTER_URL) return { found: false, error: "no control center configured" }

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
    return body
  } catch {
    return { found: false, error: "resolve failed" }
  }
}
