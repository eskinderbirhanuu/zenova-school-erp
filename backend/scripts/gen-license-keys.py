"""
Generate RSA key pair for license file signing.

Usage:
    python scripts/gen-license-keys.py

Output:
    - keys/license_private.pem  (KEEP SECRET — never distribute)
    - keys/license_public.pem   (embed in app code)

For production:
    Store private key in a secure location (offline USB / HSM / Vault).
    Never commit private key to git.
"""
import sys
import os
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend


def generate_key_pair(key_size: int = 4096) -> tuple[bytes, bytes]:
    """Generate RSA key pair.
    
    Args:
        key_size: 2048 or 4096 bits. 4096 recommended for production.
    
    Returns:
        (private_key_pem, public_key_pem)
    """
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=key_size,
        backend=default_backend(),
    )
    
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    
    public_key = private_key.public_key()
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    
    return private_pem, public_pem


def main():
    keys_dir = Path(__file__).parent.parent / "keys"
    keys_dir.mkdir(exist_ok=True)
    
    print("Generating 4096-bit RSA key pair...")
    private_pem, public_pem = generate_key_pair(4096)
    
    private_path = keys_dir / "license_private.pem"
    public_path = keys_dir / "license_public.pem"
    
    private_path.write_bytes(private_pem)
    public_path.write_bytes(public_pem)
    
    print(f"Private key: {private_path}  ({len(private_pem)} bytes)")
    print(f"Public key:  {public_path}  ({len(public_pem)} bytes)")
    print()
    print("IMPORTANT:")
    print("  - KEEP license_private.pem SECRET. Never commit to git.")
    print("  - license_public.pem will be embedded in the app code.")
    print("  - For production: store private key on encrypted USB / HSM.")
    
    # Show public key for embedding
    print()
    print("=== PUBLIC KEY (copy this for embedding) ===")
    print(public_pem.decode())
    print("=== END PUBLIC KEY ===")


if __name__ == "__main__":
    main()
