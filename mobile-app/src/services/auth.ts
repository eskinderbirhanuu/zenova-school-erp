import { getStoredRefreshToken, setStoredSession } from "./storage"

export interface LoginResult {
  accessToken: string | null
  refreshToken: string | null
  roleName: string | null
  mfaRequired: boolean
  mfaSetupRequired: boolean
  mfaToken: string | null
}

export interface MfaBootstrapSetup {
  secret: string
  qrCodeUrl: string
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
    mfa_setup_required?: boolean
    mfa_token?: string | null
    detail?: string
  }

  if (!res.ok) {
    const detail = typeof body.detail === "string" ? body.detail : "Login failed"
    throw new Error(detail)
  }

  const accessToken = extractCookie(res.headers, "access_token")
  const refreshToken = extractCookie(res.headers, "refresh_token")

  if (body.mfa_required) {
    return {
      accessToken: null,
      refreshToken: null,
      roleName: body.role_name ?? null,
      mfaRequired: true,
      mfaSetupRequired: body.mfa_setup_required ?? false,
      mfaToken: body.mfa_token ?? null,
    }
  }

  if (accessToken) {
    await setStoredSession(accessToken, refreshToken)
  }

  return {
    accessToken,
    refreshToken,
    roleName: body.role_name ?? null,
    mfaRequired: false,
    mfaSetupRequired: false,
    mfaToken: null,
  }
}

/**
 * Start MFA setup for a pending-login user (no access token needed). Returns
 * the TOTP secret and an otpauth:// provisioning URI for the authenticator app.
 */
export async function mfaBootstrapSetup(
  schoolUrl: string,
  mfaToken: string,
): Promise<MfaBootstrapSetup> {
  const res = await fetch(`${schoolUrl}/api/v1/auth/mfa/bootstrap/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfa_token: mfaToken }),
  })
  const body = (await res.json().catch(() => ({}))) as {
    secret?: string
    qr_code_url?: string
    detail?: string
  }
  if (!res.ok) {
    throw new Error(typeof body.detail === "string" ? body.detail : "MFA setup failed")
  }
  return { secret: body.secret ?? "", qrCodeUrl: body.qr_code_url ?? "" }
}

/**
 * Confirm a TOTP code during MFA setup (no access token needed). Returns the
 * single-use backup codes after MFA is enabled.
 */
export async function mfaBootstrapVerify(
  schoolUrl: string,
  mfaToken: string,
  code: string,
): Promise<string[]> {
  const res = await fetch(`${schoolUrl}/api/v1/auth/mfa/bootstrap/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfa_token: mfaToken, code }),
  })
  const body = (await res.json().catch(() => ({}))) as {
    backup_codes?: string[]
    detail?: string
  }
  if (!res.ok) {
    throw new Error(typeof body.detail === "string" ? body.detail : "MFA verification failed")
  }
  return body.backup_codes ?? []
}

/**
 * Complete a two-factor login with the short-lived `mfa_token` returned when
 * `mfa_required` is true.
 */
export async function mfaLogin(
  schoolUrl: string,
  mfaToken: string,
  code: string,
): Promise<{ roleName: string | null }> {
  const url = `${schoolUrl}/api/v1/auth/mfa/login`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfa_token: mfaToken, mfa_code: code }),
  })
  const body = (await res.json().catch(() => ({}))) as {
    role_name?: string | null
    detail?: string
  }
  if (!res.ok) {
    throw new Error(typeof body.detail === "string" ? body.detail : "MFA verification failed")
  }
  const accessToken = extractCookie(res.headers, "access_token")
  const refreshToken = extractCookie(res.headers, "refresh_token")
  if (accessToken) {
    await setStoredSession(accessToken, refreshToken)
  }
  return { roleName: body.role_name ?? null }
}

/**
 * Exchange a refresh token for a fresh access token (token rotation handled
 * server-side). Returns the new access token or null on failure.
 */
export async function refreshSession(schoolUrl: string): Promise<string | null> {
  const refreshToken = await getStoredRefreshToken()
  if (!refreshToken) return null
  const res = await fetch(`${schoolUrl}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) return null
  const accessToken = extractCookie(res.headers, "access_token")
  const newRefreshToken = extractCookie(res.headers, "refresh_token")
  if (accessToken) {
    await setStoredSession(accessToken, newRefreshToken ?? refreshToken)
  }
  return accessToken
}

export async function apiGet(baseUrl: string, path: string, token: string): Promise<unknown> {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}
