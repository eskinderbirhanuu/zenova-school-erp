import { CONTROL_CENTER_URL, SCHOOLS_FEED_PATH } from "../config/app"

export interface School {
  name: string
  domain: string
  code: string
}

/**
 * Search for a school on the ZENOVA Control Center.
 * Returns an empty list when the Control Center is not configured or
 * unreachable — the user can still enter a school address manually.
 */
export async function searchSchools(query: string): Promise<School[]> {
  if (!CONTROL_CENTER_URL) return []
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(
      `${CONTROL_CENTER_URL}${SCHOOLS_FEED_PATH}?search=${encodeURIComponent(query)}`,
      { signal: controller.signal },
    )
    clearTimeout(timer)
    if (!res.ok) return []
    const body = (await res.json()) as { schools?: School[] }
    return Array.isArray(body.schools) ? body.schools : []
  } catch {
    return []
  }
}
