import json
import base64
import struct
import hashlib
import secrets
import logging
from typing import Optional
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from cryptography.exceptions import InvalidSignature

logger = logging.getLogger(__name__)

CHALLENGE_LENGTH = 32
RP_ID = "zenova.local"
RP_NAME = "Zenova School"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "==")


def generate_challenge() -> str:
    return _b64url(secrets.token_bytes(CHALLENGE_LENGTH))


def _parse_cose_key(cbor_hex: str) -> bytes:
    """Parse a COSE-encoded public key and return SPKI DER bytes.
    
    Supports:
      - EC2 (type 2) with P-256 / ES256 (-7 alg)
      - RSA (type 3) with RS256 (-257 alg)
    """
    raw = bytes.fromhex(cbor_hex)

    if len(raw) < 4 or raw[0] != 0xa5:
        raise ValueError("Unsupported COSE key format")

    idx = 1
    kty = crv = None
    x = y = b""
    n = e = b""

    def _parse_item(data: bytes, start: int):
        tag = data[start]
        if tag >= 0x20:
            raise ValueError("Unsupported CBOR item")
        int_val = tag & 0x1f
        if int_val <= 23:
            return int_val, start + 1
        return None, start  # placeholder

    # Simplified parse for COSE key (a5 = map of 5)
    try:
        import cbor2
        cose = cbor2.loads(raw)
        kty = cose.get(1)
        if kty == 2:
            crv = cose.get(3)
            x = cose.get(-2)
            y = cose.get(-3)
        elif kty == 3:
            n = cose.get(-1)
            e = cose.get(-2)
    except ImportError:
        for i in range(5):
            if idx >= len(raw):
                break
            k = raw[idx] & 0x1f if raw[idx] < 0x20 else None
            idx += 1
            if k == 1:
                _parse_item(raw, idx)
            elif k == 2:
                _parse_item(raw, idx)

    if kty == 2 and crv == 1 and x and y:
        pub = ec.EllipticCurvePublicNumbers(
            int.from_bytes(x, "big"),
            int.from_bytes(y, "big"),
            ec.SECP256R1(),
        )
        return pub.public_key().public_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    elif kty == 3 and n and e:
        pub = rsa.RSAPublicNumbers(int.from_bytes(e, "big"), int.from_bytes(n, "big"))
        return pub.public_key().public_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )

    raise ValueError("Unsupported COSE key (kty={kty})")


def _load_public_key_from_der(der_bytes: bytes):
    return serialization.load_der_public_key(der_bytes)


def verify_attestation(
    credential_id: str,
    client_data_json: str,
    attestation_object: str,
    challenge: str,
    origin: str,
) -> Optional[str]:
    """Verify a WebAuthn registration response. Returns COSE public key hex on success."""
    try:
        cd = json.loads(client_data_json)
        if cd.get("type") != "webauthn.create":
            return None
        if cd.get("challenge") != challenge:
            return None
        if cd.get("origin") != origin:
            return None

        att = _b64url_decode(attestation_object)
        if len(att) < 2:
            return None

        try:
            import cbor2
            att_map = cbor2.loads(att)
            auth_data = att_map.get("authData", b"")
        except ImportError:
            auth_data = att[2:] if att[0:1] == b"\xa3" else att

        if len(auth_data) < 37:
            return None

        rp_id_hash = auth_data[:32]
        expected_rp_hash = hashlib.sha256(RP_ID.encode()).digest()
        if rp_id_hash != expected_rp_hash:
            return None

        flags = auth_data[32]
        counter = struct.unpack(">I", auth_data[33:37])[0]

        att_start = 37
        if len(auth_data) < att_start + 18:
            return None

        aaguid = auth_data[att_start:att_start+16]
        cred_id_len = struct.unpack(">H", auth_data[att_start+16:att_start+18])[0]
        cred_id = auth_data[att_start+18:att_start+18+cred_id_len]

        if _b64url(cred_id) != credential_id:
            return None

        cose_key = auth_data[att_start+18+cred_id_len:]
        if not cose_key:
            return None

        return cose_key.hex()
    except Exception as exc:
        logger.warning("Attestation verification failed: %s", exc)
        return None


def verify_assertion(
    credential_id: str,
    client_data_json: str,
    authenticator_data: str,
    signature: str,
    public_key_hex: str,
    challenge: str,
    origin: str,
) -> bool:
    """Verify a WebAuthn authentication assertion."""
    try:
        cd = json.loads(client_data_json)
        if cd.get("type") != "webauthn.get":
            return False
        if cd.get("challenge") != challenge:
            return False
        if cd.get("origin") != origin:
            return False

        auth_data = _b64url_decode(authenticator_data)
        sig = _b64url_decode(signature)

        client_data_hash = hashlib.sha256(client_data_json.encode()).digest()
        signed_data = auth_data + client_data_hash

        der_key = _parse_cose_key(public_key_hex)
        pub_key = _load_public_key_from_der(der_key)

        if isinstance(pub_key, ec.EllipticCurvePublicKey):
            try:
                pub_key.verify(sig, signed_data, ec.ECDSA(hashes.SHA256()))
                return True
            except InvalidSignature:
                return False
        elif isinstance(pub_key, rsa.RSAPublicKey):
            try:
                pub_key.verify(sig, signed_data, hashes.SHA256())
                return True
            except InvalidSignature:
                pass

            try:
                from cryptography.hazmat.primitives.asymmetric.padding import PKCS1v15
                pub_key.verify(sig, signed_data, PKCS1v15(), hashes.SHA256())
                return True
            except InvalidSignature:
                return False
        return False
    except Exception as exc:
        logger.warning("Assertion verification failed: %s", exc)
        return False
