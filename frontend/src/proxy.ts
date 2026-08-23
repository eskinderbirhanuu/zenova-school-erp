import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import {
  PUBLIC_ROUTES,
  ROLE_DASHBOARD,
  getBestDashboard,
  canAccessRoute,
} from "@/config/roles"

// Server-side (middleware) API base: ZENOVA_API_URL is read at runtime (set per-server
// in compose, e.g. http://backend:8000/api/v1) so middleware fetches don't depend on
// the build-time NEXT_PUBLIC_API_URL.
const API_URL = process.env.ZENOVA_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

// Server identity: "school" (default) or "org" (ZENOVA Control Center).
// Enforced server-side so redirects happen before any page renders; the client
// runtime-config.js (APP_MODE) covers client-side reads.
const APP_MODE = process.env.ZENOVA_APP_MODE || "school"
const isOrg = APP_MODE === "org"

// School route groups — blocked on org servers (org staff see org only).
const SCHOOL_ROUTE_PREFIXES = [
  "/admin", "/registrar", "/teacher", "/finance", "/hr", "/inventory",
  "/library", "/cafeteria", "/auditor", "/director", "/corporate",
  "/parent", "/student",
]

function isSchoolRoute(pathname: string): boolean {
  return SCHOOL_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

async function checkSetupComplete(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/setup/status`, {
      signal: AbortSignal.timeout(8000),
      credentials: "include",
    })
    const data = await res.json()
    return data.setup_complete === true
  } catch {
    return false
  }
}

function parseRoles(userRolesCookie: string | undefined): string[] {
  if (!userRolesCookie || userRolesCookie === "") return []
  return userRolesCookie.split(",").filter(Boolean)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/runtime-config.js" ||
    pathname.startsWith("/icons/")
  ) {
    return NextResponse.next()
  }

  // Mode-aware public-route redirects (server identity separation):
  // - org server: school login → org login; school installer branches → org installer
  // - school server: org login/installer → school login/installer
  if (isOrg && pathname === "/login") {
    return NextResponse.redirect(new URL("/super-admin/login", request.url))
  }
  if (isOrg && (pathname === "/installer" || pathname === "/installer/school" || pathname === "/installer/main" || pathname === "/installer/branch")) {
    return NextResponse.redirect(new URL("/installer/super-admin", request.url))
  }
  if (!isOrg && pathname === "/super-admin/login") {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  if (!isOrg && (pathname === "/installer" || pathname === "/installer/super-admin")) {
    return NextResponse.redirect(new URL("/installer/school", request.url))
  }

  if (PUBLIC_ROUTES.some((r: any) => pathname === r || pathname.startsWith(r + "/"))) {
    const response = NextResponse.next()
    response.cookies.delete("csrf_token")
    const csrfToken = crypto.randomUUID()
    response.cookies.set("csrf_token", csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,
    })
    return response
  }

  const accessToken = request.cookies.get("access_token")?.value
  const userRole = request.cookies.get("user_role")?.value
  const userRoles = parseRoles(request.cookies.get("user_roles")?.value)
  const allRoles = userRoles.length > 0 ? userRoles : (userRole ? [userRole] : [])

  if (pathname === "/") {
    if (accessToken && allRoles.length > 0) {
      const bestDashboard = getBestDashboard(allRoles) || (userRole ? ROLE_DASHBOARD[userRole] : null)
      if (bestDashboard) {
        return NextResponse.redirect(new URL(bestDashboard, request.url))
      }
    }
    const setupComplete = await checkSetupComplete()
    if (!setupComplete) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL(isOrg ? "/super-admin/login" : "/login", request.url))
  }

  if (!accessToken || allRoles.length === 0) {
    const loginUrl = new URL(isOrg ? "/super-admin/login" : "/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Server-identity gating (after auth): org servers block school routes,
  // school servers block the entire /super-admin/* area.
  if (isOrg && isSchoolRoute(pathname)) {
    return NextResponse.redirect(new URL("/super-admin/dashboard", request.url))
  }
  if (!isOrg && (pathname === "/super-admin" || pathname.startsWith("/super-admin/"))) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const allowed = canAccessRoute(allRoles, pathname)
  if (allowed) {
    const response = NextResponse.next()
    if (!request.cookies.has("csrf_token")) {
      const csrfToken = crypto.randomUUID()
      response.cookies.set("csrf_token", csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60,
      })
    }
    return response
  }

  const bestDashboard = getBestDashboard(allRoles) || (userRole ? ROLE_DASHBOARD[userRole] : null)
  if (bestDashboard) {
    return NextResponse.redirect(new URL(bestDashboard, request.url))
  }

  return NextResponse.redirect(new URL("/unauthorized", request.url))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/.*|runtime-config.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
