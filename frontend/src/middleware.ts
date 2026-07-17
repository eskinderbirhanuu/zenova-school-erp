import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import {
  PUBLIC_ROUTES,
  ROLE_DASHBOARD,
  ROLE_PREFIXES,
} from "@/config/roles"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

async function checkSetupComplete(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/setup/status`, {
      signal: AbortSignal.timeout(3000),
      credentials: "include",
    })
    const data = await res.json()
    return data.setup_complete === true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/")
  ) {
    return NextResponse.next()
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

  if (pathname === "/") {
    const setupComplete = await checkSetupComplete()
    if (!setupComplete) {
      return NextResponse.next()
    }
    if (accessToken && userRole && ROLE_DASHBOARD[userRole]) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARD[userRole], request.url))
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (!accessToken || !userRole) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const allowedPrefixes = ROLE_PREFIXES[userRole]
  if (!allowedPrefixes) {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  const onAllowedRoute = allowedPrefixes.some((prefix: any) => pathname.startsWith(prefix))
  if (onAllowedRoute) {
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

  const dashboard = ROLE_DASHBOARD[userRole]
  if (dashboard) {
    return NextResponse.redirect(new URL(dashboard, request.url))
  }

  return NextResponse.redirect(new URL("/unauthorized", request.url))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}