import { CONTROL_CENTER_URL } from "../config/app"

export interface RemoteConfig {
  minimum_version: string
  recommended_version: string
  maintenance_mode: boolean
  message: string
  features: Record<string, boolean>
}

const FALLBACK_CONFIG: RemoteConfig = {
  minimum_version: "1.0.0",
  recommended_version: "1.0.0",
  maintenance_mode: false,
  message: "",
  features: {},
}

/**
 * Fetch the global remote configuration for the app (version gating,
 * maintenance mode, feature flags). Falls back to defaults on any failure so
 * the app never hard-blocks users because of a network hiccup.
 */
export async function fetchRemoteConfig(): Promise<RemoteConfig> {
  if (!CONTROL_CENTER_URL) return FALLBACK_CONFIG
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`${CONTROL_CENTER_URL}/api/v1/public/config`, {
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return FALLBACK_CONFIG
    const body = (await res.json()) as Partial<RemoteConfig>
    return {
      minimum_version: body.minimum_version ?? FALLBACK_CONFIG.minimum_version,
      recommended_version: body.recommended_version ?? FALLBACK_CONFIG.recommended_version,
      maintenance_mode: body.maintenance_mode ?? false,
      message: body.message ?? "",
      features: body.features ?? {},
    }
  } catch {
    return FALLBACK_CONFIG
  }
}

/**
 * Compare dotted version strings ("1.2.3" >= "1.0.0").
 */
export function isVersionAtLeast(current: string, minimum: string): boolean {
  const parse = (v: string) => v.split(".").map((n) => parseInt(n, 10) || 0)
  const a = parse(current)
  const b = parse(minimum)
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    if (av > bv) return true
    if (av < bv) return false
  }
  return true
}
