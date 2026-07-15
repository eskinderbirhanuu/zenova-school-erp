import api from "@/services/api"

const RP_ID = window.location.hostname || "zenova.local"
const ORIGIN = window.location.origin

export interface WebAuthnCredential {
  id: string
  credential_id: string
  device_name: string | null
  created_at: string | null
  last_used_at: string | null
}

export async function registerPasskey(deviceName?: string): Promise<void> {
  const challengeRes = await api.post("/auth/webauthn/register/challenge", {
    device_name: deviceName || null,
  })
  const { challenge, rp_id, rp_name, user_id, user_name } = challengeRes.data

  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: _b64url(challenge) as BufferSource,
      rp: { id: rp_id, name: rp_name },
      user: {
        id: new TextEncoder().encode(user_id),
        name: user_name,
        displayName: user_name,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    },
  }) as PublicKeyCredential | null

  if (!cred) throw new Error("User cancelled")

  const attResp = cred.response as AuthenticatorAttestationResponse

  await api.post("/auth/webauthn/register/verify", {
    credential_id: cred.id,
    client_data_json: _buf2str(attResp.clientDataJSON),
    attestation_object: _buf2str(attResp.attestationObject),
    device_name: deviceName || null,
    origin: ORIGIN,
  })
}

export async function authenticateWithPasskey(): Promise<any> {
  const challengeRes = await api.post("/auth/webauthn/auth/challenge", {})
  const { challenge, credential_ids, rp_id } = challengeRes.data

  const cred = await navigator.credentials.get({
    publicKey: {
      challenge: _b64url(challenge) as BufferSource,
      rpId: rp_id,
      allowCredentials: credential_ids.length > 0
        ? credential_ids.map((id: string) => ({ id: _b64url(id) as BufferSource, type: "public-key" }))
        : undefined,
      userVerification: "preferred",
    },
  }) as PublicKeyCredential | null

  if (!cred) throw new Error("User cancelled")

  const assResp = cred.response as AuthenticatorAssertionResponse

  const verifyRes = await api.post("/auth/webauthn/auth/verify", {
    credential_id: cred.id,
    client_data_json: _buf2str(assResp.clientDataJSON),
    authenticator_data: _buf2str(assResp.authenticatorData),
    signature: _buf2str(assResp.signature),
    origin: ORIGIN,
  })

  return verifyRes.data
}

export async function listPasskeys(): Promise<WebAuthnCredential[]> {
  const res = await api.get("/auth/webauthn/credentials")
  return res.data.credentials
}

export async function deletePasskey(id: string): Promise<void> {
  await api.delete(`/auth/webauthn/credentials/${id}`)
}

function _b64url(data: string): Uint8Array {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(data.length / 4) * 4, "=")
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

function _buf2str(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}
