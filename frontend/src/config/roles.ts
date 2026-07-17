/// Shared role definitions — Edge-compatible (no React imports).
/// Single source of truth for middleware.ts and navigation.ts.

export const ROLE_DASHBOARD: Record<string, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  ADMIN: "/admin/dashboard",
  DIRECTOR: "/director/dashboard",
  REGISTRAR: "/registrar/dashboard",
  TEACHER: "/teacher/dashboard",
  FINANCE: "/finance/dashboard",
  INVENTORY: "/inventory/dashboard",
  HR: "/hr/dashboard",
  LIBRARY: "/library/dashboard",
  CAFETERIA: "/cafeteria/dashboard",
  AUDITOR: "/audit/dashboard",
  PARENT: "/parent/dashboard",
  STUDENT: "/student/dashboard",
  ZENOVA_CORPORATE_ADMIN: "/corporate/dashboard",
  ZENOVA_CARD_OFFICER: "/corporate/card-printing",
  ZENOVA_SUPPORT: "/corporate/dashboard",
}

/** URL prefixes each role is allowed to access. */
export const ROLE_PREFIXES: Record<string, string[]> = {
  SUPER_ADMIN: ["/super-admin", "/platform"],
  ADMIN: ["/admin"],
  DIRECTOR: ["/director"],
  REGISTRAR: ["/registrar"],
  TEACHER: ["/teacher"],
  FINANCE: ["/finance"],
  INVENTORY: ["/inventory"],
  HR: ["/hr"],
  LIBRARY: ["/library"],
  CAFETERIA: ["/cafeteria"],
  AUDITOR: ["/audit"],
  PARENT: ["/parent"],
  STUDENT: ["/student"],
  ZENOVA_CORPORATE_ADMIN: ["/corporate"],
  ZENOVA_CARD_OFFICER: ["/corporate"],
  ZENOVA_SUPPORT: ["/corporate"],
}

export const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/activate",
  "/activate/main",
  "/activate/branch",
  "/setup",
  "/unauthorized",
  "/super-admin/login",
  "/about",
  "/documentation",
  "/privacy",
  "/terms",
  "/careers",
  "/press",
  "/cookies",
  "/license",
  "/recovery",
  "/recovery/codes",
  "/recovery/emergency",
]
