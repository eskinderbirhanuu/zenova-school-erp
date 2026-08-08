import { setStoredSession } from "./storage"

export interface LoginResult {
  accessToken: string | null
  refreshToken: string | null
  roleName: string | null
  mfaRequired: boolean
}

function extractCookie(headers: Headers, name: string): string | null {
  // React Native exposes 'set-cookie' inconsistently across platforms. Try the
  // direct key first, then scan all headers case-insensitively.
  const direct = headers.get("set-cookie")
  const values = direct ? [direct] : []
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie" && value !== direct) values.push(value)
  })
  for (const header of values) {
    for (const part of header.split(",")) {
      const trimmed = part.trim()
      if (trimmed.startsWith(`${name}=`)) {
        const value = trimmed.slice(name.length + 1).split(";")[0]
        if (value) return decodeURIComponent(value)
      }
    }
  }
  return null
}

/**
 * Log in against a school's own ZENOVA backend using the existing
 * `POST /api/v1/auth/login` endpoint. The access token is delivered in a
 * Set-Cookie header; we capture it so subsequent calls can use
 * `Authorization: Bearer <token>`.
 */
export async function login(
  schoolUrl: string,
  identifier: string,
  password: string,
  isEmployeeId: boolean,
): Promise<LoginResult> {
  const url = `${schoolUrl}/api/v1/auth/login`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      isEmployeeId
        ? { employee_id: identifier, password }
        : { email: identifier, password },
    ),
  })

  const body = (await res.json().catch(() => ({}))) as {
    role_name?: string | null
    mfa_required?: boolean
    detail?: string
  }

  if (!res.ok) {
    const detail = typeof body.detail === "string" ? body.detail : "Login failed"
    throw new Error(detail)
  }

  const accessToken = extractCookie(res.headers, "access_token")
  const refreshToken = extractCookie(res.headers, "refresh_token")

  if (body.mfa_required) {
    return { accessToken: null, refreshToken: null, roleName: body.role_name ?? null, mfaRequired: true }
  }

  if (accessToken) {
    await setStoredSession(accessToken, refreshToken)
  }

  return {
    accessToken,
    refreshToken,
    roleName: body.role_name ?? null,
    mfaRequired: false,
  }
}

export async function apiGet(baseUrl: string, path: string, token: string): Promise<unknown> {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}
