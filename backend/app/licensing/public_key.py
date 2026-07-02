"""
Embedded RSA public key for license file verification.

This key is the PUBLIC half of the license signing key pair.
The PRIVATE key is kept offline (never distributed).

To regenerate:
    python scripts/gen-license-keys.py
    Then copy the new public key here.
"""
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

LICENSE_PUBLIC_KEY_PEM = b"""-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEArnwELC/t6ZISSdwRT4dR
dyDFw4AvuXQYpFGmV6KsJz88OBxvgxm8vVYKuSCBxcdXDi/5JodcCGUjkaXhv6WK
iX+3GWuV0J2biG9Ul8lF1coEAGAjMcbGPmYbMo/qj9kKoPtb6VFB9KbO4It8erXJ
7gAr+ldvBvssnHFPahroygve+EHRBR/ZE7LeeMwNV1+hUCw9RFBhS6IejApdvoqt
1F5tbNjQ2IubJk6MUzn1L46cQPHZjcFRiBB9x1YXCsMe4vhIaBBRXgIPnB5xoL29
DP0SJISyKri0h8bxrxY2koEgbEEQSqTBCimxdvcXvAZRek7hnjy5f1c0gD0TPmka
DqejLBKwc5Y3t3bOXFC3AB+/hnP7YsZWqATRqxFj0OUELggyFJQknzJWPtAccrsS
q5mkdES7Qy8PAktD7z4OJQ4Thb27deHccQa2zSEIB1wSD1tVZ7tb/qmXKXSSmU50
AU6Rd9dg3yU2OMoYEXK4MRVvPhYcb0yKaEB7C6qppBm5nuj7ZyIA/jZw71OrL0sC
IvrF6KApBxN69m3dlPkk4rbGdfXOGKbt2z+AMMqwg19Re65n3rIM59ki9ZPz0rBg
By8PPeLNs6zZKzNPe6k531uDgGs6aOvVIRFg08wvH47vnP9S1ol8j3hX96t0qnTf
6AhJGDqodnXPWH8fUVCZA38CAwEAAQ==
-----END PUBLIC KEY-----"""


def get_license_public_key():
    """Load and return the embedded RSA public key."""
    return serialization.load_pem_public_key(
        LICENSE_PUBLIC_KEY_PEM,
        backend=default_backend(),
    )
