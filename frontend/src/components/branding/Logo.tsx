"use client"

import { memo, useState } from "react"

export type LogoVariant = "full" | "mark" | "wordmark" | "compact"

interface LogoProps {
  variant?: LogoVariant
  className?: string
  showTagline?: boolean
  dark?: boolean
}

/**
 * ZENOVA Logo Component
 *
 * Uses the official ZENOVA brand logo from /public/assets/branding/zenova-logo.png
 *
 * Usage:
 * - variant="full" → Full logo (welcome page, login)
 * - variant="mark" → Icon only (sidebar collapsed, favicon, mobile)
 * - variant="wordmark" → Text only (email headers)
 * - variant="compact" → Icon + text compact (dashboard header, sidebar)
 */
export const Logo = memo(({
  variant = "compact",
  className = "",
  showTagline = false,
  dark = false
}: LogoProps) => {
  const [imgError, setImgError] = useState(false)

  const basePath = "/assets/branding/zenova-logo.png"

  const sizes: Record<LogoVariant, { w: number; h: number }> = {
    full: { w: 240, h: 60 },
    mark: { w: 48, h: 48 },
    wordmark: { w: 180, h: 36 },
    compact: { w: 160, h: 40 },
  }

  const { w, h } = sizes[variant]

  // Fallback SVG if image fails to load
  const FallbackLogo = () => (
    <svg width={w} height={h} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-all duration-300">
      <rect width="48" height="48" rx="12" fill={dark ? "#1e293b" : "#2563EB"} />
      <text x="24" y="32" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" fontFamily="system-ui">Z</text>
    </svg>
  )

  switch (variant) {
    case "full":
      return (
        <div className={`flex flex-col items-center ${className}`}>
          {imgError ? (
            <FallbackLogo />
          ) : (
            <img
              src={basePath}
              alt="ZENOVA"
              width={w}
              height={h}
              className="object-contain"
              onError={() => setImgError(true)}
            />
          )}
          {showTagline && (
            <p className={`text-xs mt-1 tracking-[0.2em] uppercase ${dark ? "text-white/60" : "text-gray-500"}`}>
              Smart School • Limitless Possibilities
            </p>
          )}
        </div>
      )

    case "mark":
      return (
        <div className={`flex items-center justify-center ${className}`} aria-label="ZENOVA">
          {imgError ? (
            <FallbackLogo />
          ) : (
            <img
              src={basePath}
              alt="ZENOVA"
              width={w}
              height={h}
              className="object-contain"
              onError={() => setImgError(true)}
            />
          )}
        </div>
      )

    case "wordmark":
      return (
        <div className={`flex items-center ${className}`} aria-label="ZENOVA">
          {imgError ? (
            <FallbackLogo />
          ) : (
            <img
              src={basePath}
              alt="ZENOVA"
              width={w}
              height={h}
              className="object-contain"
              onError={() => setImgError(true)}
            />
          )}
        </div>
      )

    case "compact":
    default:
      return (
        <div className={`flex items-center ${className}`} aria-label="ZENOVA">
          {imgError ? (
            <FallbackLogo />
          ) : (
            <img
              src={basePath}
              alt="ZENOVA"
              width={w}
              height={h}
              className="object-contain"
              onError={() => setImgError(true)}
            />
          )}
        </div>
      )
  }
})

Logo.displayName = "Logo"

export default Logo