export const colors = {
  background: "#0B0F1A",
  surface: "#FFFFFF",
  surfaceDark: "#111827",
  primary: "#6366F1",
  secondary: "#8B5CF6",
  accent: "#EC4899",
  warning: "#F59E0B",
  textPrimary: "#0B0F1A",
  textSecondary: "#6B7280",
  textOnDark: "#FFFFFF",
  textMutedDark: "rgba(255,255,255,0.55)",
  border: "#E5E7EB",
  borderDark: "rgba(255,255,255,0.10)",
  error: "#EF4444",
  success: "#10B981",
  chipBg: "rgba(255,255,255,0.10)",
} as const;

export const gradientColors = ["#6366F1", "#8B5CF6", "#EC4899", "#F59E0B"] as const;

export interface SchoolBranding {
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  tagline?: string | null
}

export interface SchoolTheme {
  primary: string
  secondary: string
  accent: string
  logoUrl: string | null
  tagline: string | null
  gradient: [string, string, string, string]
}

function isHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim())
}

/**
 * Relative luminance (0..1). Used to guarantee WCAG contrast for button text.
 */
function luminance(hex: string): number {
  const raw = hex.replace("#", "")
  const r = parseInt(raw.slice(0, 2), 16) / 255
  const g = parseInt(raw.slice(2, 4), 16) / 255
  const b = parseInt(raw.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/**
 * White text on `color` must reach 4.5:1 (WCAG AA) for normal text.
 */
function hasWhiteTextContrast(hex: string): boolean {
  const l = luminance(hex)
  return (1.05 / (l + 0.05)) >= 4.5
}

export function defaultTheme(): SchoolTheme {
  return {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    logoUrl: null,
    tagline: null,
    gradient: [...gradientColors] as [string, string, string, string],
  }
}

/**
 * Build a school-branded theme. Invalid or low-contrast colors fall back to the
 * ZENOVA defaults so arbitrary school branding can never break usability.
 */
export function themeFromBranding(branding: SchoolBranding | null | undefined): SchoolTheme {
  const theme = defaultTheme()
  if (!branding) return theme

  const candidate = {
    primary: isHexColor(branding.primary_color) ? branding.primary_color.trim() : null,
    secondary: isHexColor(branding.secondary_color) ? branding.secondary_color.trim() : null,
    accent: isHexColor(branding.accent_color) ? branding.accent_color.trim() : null,
  }

  if (candidate.primary && hasWhiteTextContrast(candidate.primary)) theme.primary = candidate.primary
  if (candidate.secondary) theme.secondary = candidate.secondary
  if (candidate.accent) theme.accent = candidate.accent

  theme.gradient = [
    theme.primary,
    theme.secondary,
    theme.accent,
    theme.accent,
  ]

  theme.logoUrl = branding.logo_url && branding.logo_url.length > 0 ? branding.logo_url : null
  theme.tagline = branding.tagline && branding.tagline.length > 0 ? branding.tagline : null
  return theme
}
