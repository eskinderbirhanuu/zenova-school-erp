export interface Partner {
  name: string
  logo?: string | null
  tagline?: string | null
}

/**
 * Bundled fallback partner list. The app tries to fetch the live feed from the
 * ZENOVA Control Center (`GET /api/v1/public/partners`) and falls back to this
 * list when the Control Center is unreachable or not configured.
 */
export const FALLBACK_PARTNERS: Partner[] = [
  { name: "ethio telecom", tagline: "Connectivity Partner" },
  { name: "Commercial Bank of Ethiopia", tagline: "Banking Partner" },
  { name: "Awash Bank", tagline: "Banking Partner" },
  { name: "Telebirr", tagline: "Mobile Money" },
  { name: "Chapa", tagline: "Payment Gateway" },
]
