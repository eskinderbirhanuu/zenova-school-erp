import { apiGet, apiPost } from "./api"

export interface MfaSetupResult {
  secret: string
  qrCodeUrl: string
}

export interface MfaStatus {
  enabled: boolean
  method: string | null
}

/**
 * Voluntarily enable MFA (Gap A4). Any signed-in user can turn on TOTP.
 * Returns the TOTP secret + provisioning URI; MFA is NOT enabled until
 * `mfaVerify` confirms a code.
 */
export async function mfaSetup(baseUrl: string): Promise<MfaSetupResult> {
  const body = await apiPost<{ secret?: string; qr_code_url?: string }>(baseUrl, "/auth/mfa/setup", {})
  return { secret: body.secret ?? "", qrCodeUrl: body.qr_code_url ?? "" }
}

/**
 * Confirm a TOTP code during voluntary setup. Enables MFA and returns the
 * single-use backup codes.
 */
export async function mfaVerify(baseUrl: string, code: string): Promise<string[]> {
  const body = await apiPost<{ backup_codes?: string[] }>(baseUrl, "/auth/mfa/verify", { code })
  return body.backup_codes ?? []
}

/**
 * Disable MFA after confirming the current password.
 */
export async function mfaDisable(baseUrl: string, password: string): Promise<void> {
  await apiPost<{ message?: string }>(baseUrl, "/auth/mfa/disable", { password })
}

/**
 * Regenerate backup codes (invalidates the previous set).
 */
export async function mfaRegenerateBackupCodes(baseUrl: string): Promise<string[]> {
  const body = await apiPost<{ backup_codes?: string[] }>(baseUrl, "/auth/mfa/backup-codes", {})
  return body.backup_codes ?? []
}

/**
 * Fetch the current MFA status from `/auth/me`.
 */
export async function mfaStatus(baseUrl: string): Promise<MfaStatus> {
  const me = await apiGet<{ mfa_enabled?: boolean }>(baseUrl, "/auth/me")
  return { enabled: me.mfa_enabled ?? false, method: me.mfa_enabled ? "totp" : null }
}
