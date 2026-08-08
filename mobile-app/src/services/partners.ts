import { FALLBACK_PARTNERS } from "../config/partners"
import type { Partner } from "../config/partners"
import { CONTROL_CENTER_URL, PARTNERS_FEED_PATH } from "../config/app"
import { PARTNER_FEED_CACHE, readCachedFeed, writeCachedFeed } from "./storage"

/**
 * Fetch the partner feed from the ZENOVA Control Center.
 * Falls back to the bundled list when the Control Center is unreachable or
 * not configured, so the ticker never shows empty.
 */
export async function fetchPartnerFeed(): Promise<Partner[]> {
  if (!CONTROL_CENTER_URL) {
    const cached = await readCachedFeed<Partner[]>(PARTNER_FEED_CACHE)
    return cached && cached.length ? cached : FALLBACK_PARTNERS
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`${CONTROL_CENTER_URL}${PARTNERS_FEED_PATH}`, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`feed responded ${res.status}`)
    const body = (await res.json()) as { partners?: Partner[] }
    const partners = Array.isArray(body.partners) ? body.partners : FALLBACK_PARTNERS
    await writeCachedFeed(PARTNER_FEED_CACHE, partners)
    return partners
  } catch {
    const cached = await readCachedFeed<Partner[]>(PARTNER_FEED_CACHE)
    return cached && cached.length ? cached : FALLBACK_PARTNERS
  }
}
