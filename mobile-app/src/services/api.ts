import { getStoredToken, setStoredSession } from "./storage"
import { refreshSession } from "./auth"

export class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

export class SessionExpiredError extends ApiError {
  constructor() {
    super("Session expired", 401)
    this.name = "SessionExpiredError"
  }
}

/**
 * Authenticated GET with automatic token refresh on 401 (Gap A1).
 * Throws SessionExpiredError when refresh also fails so callers can sign out.
 */
export async function apiGet<T>(baseUrl: string, path: string): Promise<T> {
  let token = await getStoredToken()
  if (!token) throw new SessionExpiredError()

  const run = async (accessToken: string) => {
    const res = await fetch(`${baseUrl}/api/v1${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.status === 401) return null
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status)
    return res.json() as Promise<T>
  }

  let result = await run(token)
  if (result === null) {
    const refreshed = await refreshSession(baseUrl)
    if (!refreshed) throw new SessionExpiredError()
    token = refreshed
    result = await run(token)
  }
  if (result === null) throw new SessionExpiredError()
  return result
}

let csrfCache: { baseUrl: string; token: string; at: number } | null = null

/**
 * Fetch a CSRF token from the school backend and remember the matching cookie
 * value. Required for every non-exempt mutating call under `/api/` (Gap A3).
 */
export async function getCsrfToken(baseUrl: string): Promise<string | null> {
  if (csrfCache && csrfCache.baseUrl === baseUrl && Date.now() - csrfCache.at < 60 * 60 * 1000) {
    return csrfCache.token
  }
  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/csrf-token`)
    if (!res.ok) return null
    const body = (await res.json()) as { csrf_token?: string }
    if (!body.csrf_token) return null
    csrfCache = { baseUrl, token: body.csrf_token, at: Date.now() }
    return body.csrf_token
  } catch {
    return null
  }
}

/**
 * Authenticated POST with CSRF token + matching cookie and automatic refresh on
 * 401 (Gaps A1 + A3).
 */
export async function apiPost<T>(
  baseUrl: string,
  path: string,
  body: unknown,
): Promise<T> {
  let token = await getStoredToken()
  if (!token) throw new SessionExpiredError()

  const run = async (accessToken: string) => {
    const csrf = await getCsrfToken(baseUrl)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }
    if (csrf) {
      headers["X-CSRF-Token"] = csrf
      headers["Cookie"] = `csrf_token=${csrf}`
    }
    const res = await fetch(`${baseUrl}/api/v1${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
    if (res.status === 401) return null
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { detail?: string; code?: string }
      throw new ApiError(
        typeof errBody.detail === "string" ? errBody.detail : `Request failed (${res.status})`,
        res.status,
        errBody.code,
      )
    }
    return res.json() as Promise<T>
  }

  let result = await run(token)
  if (result === null) {
    const refreshed = await refreshSession(baseUrl)
    if (!refreshed) throw new SessionExpiredError()
    token = refreshed
    result = await run(token)
  }
  if (result === null) throw new SessionExpiredError()
  return result
}

/**
 * Validate a stored session on boot (Gap A2). Returns the authoritative role
 * from the backend (`GET /auth/me`). Throws SessionExpiredError when invalid.
 */
export async function validateSession(
  baseUrl: string,
): Promise<{ roleName: string | null; roles: string[] }> {
  const me = await apiGet<{
    role_name?: string | null
    roles?: string[] | null
  }>(baseUrl, "/auth/me")
  return { roleName: me.role_name ?? null, roles: me.roles ?? [] }
}

export function clearCsrfCache(): void {
  csrfCache = null
}
