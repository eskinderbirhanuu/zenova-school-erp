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
}

export function formatCurrency(amount: number | string, currencyCode = "ETB"): string {
  const info = CURRENCY_MAP[currencyCode]
  const symbol = info?.symbol || currencyCode
  const formatted = Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${symbol} ${formatted}`
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
