const CURRENCY_MAP: Record<string, { symbol: string; name: string }> = {
  ETB: { symbol: "Br", name: "Ethiopian Birr" },
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  AED: { symbol: "د.إ", name: "UAE Dirham" },
  SAR: { symbol: "﷼", name: "Saudi Riyal" },
  KES: { symbol: "KSh", name: "Kenyan Shilling" },
  UGX: { symbol: "USh", name: "Ugandan Shilling" },
  TZS: { symbol: "TSh", name: "Tanzanian Shilling" },
  RWF: { symbol: "FRw", name: "Rwandan Franc" },
  ZAR: { symbol: "R", name: "South African Rand" },
  NGN: { symbol: "₦", name: "Nigerian Naira" },
  GHS: { symbol: "GH₵", name: "Ghanaian Cedi" },
}

function getLocale(): string {
  if (typeof navigator !== "undefined") return navigator.language
  return "en-US"
}

export function formatCurrency(amount: number | string, currencyCode = "ETB", decimals?: number): string {
  const info = CURRENCY_MAP[currencyCode]
  const symbol = info?.symbol || currencyCode
  const minDec = decimals ?? 2
  const maxDec = decimals ?? 2
  const formatted = Number(amount).toLocaleString(getLocale(), { minimumFractionDigits: minDec, maximumFractionDigits: maxDec })
  return `${symbol} ${formatted}`
}

export function formatCurrencyShort(amount: number | string, currencyCode = "ETB"): string {
  const n = Number(amount)
  const info = CURRENCY_MAP[currencyCode]
  const symbol = info?.symbol || currencyCode
  if (n >= 1_000_000) return `${symbol} ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${symbol} ${(n / 1_000).toFixed(1)}K`
  return formatCurrency(amount, currencyCode)
}

export function getCurrencySymbol(code: string): string {
  return CURRENCY_MAP[code]?.symbol || code
}

export async function fetchCurrencies(): Promise<Record<string, number>> {
  try {
    const { default: api } = await import("@/services/api")
    const res = await api.get("/finance/currencies")
    const map: Record<string, number> = {}
    for (const c of res.data.currencies) {
      map[c.code] = c.exchange_rate_to_etb
    }
    return map
  } catch {
    return { ETB: 1 }
  }
}
