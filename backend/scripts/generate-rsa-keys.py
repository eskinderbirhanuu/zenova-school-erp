"""Generate RSA key pair for JWT RS256 signing.

Usage:
    python scripts/generate-rsa-keys.py

Output:
    ./jwt_private_key.pem
    ./jwt_public_key.pem

Set these as JWT_PRIVATE_KEY / JWT_PUBLIC_KEY env vars.
"""

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

private_pem = key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)

public_pem = key.public_key().public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
)

with open("jwt_private_key.pem", "wb") as f:
    f.write(private_pem)

with open("jwt_public_key.pem", "wb") as f:
    f.write(public_pem)

print("Generated jwt_private_key.pem and jwt_public_key.pem")
