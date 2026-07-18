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

/** Priority order for dashboard selection when user has multiple roles */
export const ROLE_PRIORITY: string[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "DIRECTOR",
  "FINANCE",
  "HR",
  "TEACHER",
  "REGISTRAR",
  "LIBRARY",
  "INVENTORY",
  "CAFETERIA",
  "AUDITOR",
  "PARENT",
  "STUDENT",
  "ZENOVA_CORPORATE_ADMIN",
  "ZENOVA_CARD_OFFICER",
  "ZENOVA_SUPPORT",
]

/** Get best dashboard URL for a set of roles */
export function getBestDashboard(roles: string[]): string | null {
  if (!roles || roles.length === 0) return null
  for (const priority of ROLE_PRIORITY) {
    if (roles.includes(priority) && ROLE_DASHBOARD[priority]) {
      return ROLE_DASHBOARD[priority]
    }
  }
  const first = roles[0]
  return ROLE_DASHBOARD[first] || null
}

/** Check if a user with given roles can access a given pathname */
export function canAccessRoute(roles: string[], pathname: string): boolean {
  if (!roles || roles.length === 0) return false
  return roles.some((role) => {
    const prefixes = ROLE_PREFIXES[role]
    return prefixes?.some((prefix: string) => pathname.startsWith(prefix))
  })
}

/** Route group → layout config (avoids duplicating layouts across 14 files) */
export const ROUTE_GROUP_ACCESS: Record<string, {
  allowedRoles: string[]
  role: string
  bypassPaths?: string[]
}> = {
  admin: { allowedRoles: ["SUPER_ADMIN", "ADMIN"], role: "ADMIN" },
  auditor: { allowedRoles: ["SUPER_ADMIN", "ADMIN", "AUDITOR"], role: "AUDITOR" },
  cafeteria: { allowedRoles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "CAFETERIA"], role: "CAFETERIA" },
  corporate: { allowedRoles: ["SUPER_ADMIN", "ADMIN", "ZENOVA_CORPORATE_ADMIN", "ZENOVA_CARD_OFFICER", "ZENOVA_SUPPORT"], role: "ZENOVA_CORPORATE_ADMIN" },
  director: { allowedRoles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR"], role: "DIRECTOR" },
  finance: { allowedRoles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "FINANCE", "AUDITOR"], role: "FINANCE" },
  hr: { allowedRoles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "HR"], role: "HR" },
  inventory: { allowedRoles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "INVENTORY", "FINANCE"], role: "INVENTORY" },
  library: { allowedRoles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "LIBRARY"], role: "LIBRARY" },
  parent: { allowedRoles: ["PARENT"], role: "PARENT" },
  registrar: { allowedRoles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "REGISTRAR"], role: "REGISTRAR" },
  student: { allowedRoles: ["STUDENT"], role: "STUDENT" },
  teacher: { allowedRoles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "TEACHER"], role: "TEACHER" },
  "super-admin": { allowedRoles: ["SUPER_ADMIN"], role: "SUPER_ADMIN", bypassPaths: ["/super-admin/login"] },
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
