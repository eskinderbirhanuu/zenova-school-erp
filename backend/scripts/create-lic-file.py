"""
Create a signed .lic file for a customer.

Usage:
    python scripts/create-lic-file.py \\
        --school-id "SCHOOL-001" \\
        --school-name "Addis Ababa High School" \\
        --valid-until "2027-12-31" \\
        --output "./output.lic"

The script reads keys/license_private.pem to sign the file.
"""
import sys
import os
import json
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.license_crypto import create_license_file, write_lic_file


def main():
    parser = argparse.ArgumentParser(description="Create a signed .lic file")
    parser.add_argument("--school-id", required=True)
    parser.add_argument("--school-name", required=True)
    parser.add_argument("--valid-until", required=True, help="e.g. 2027-12-31")
    parser.add_argument("--machine-fingerprint", default="*", help="Hardware hash or hostname pattern")
    parser.add_argument("--hostname", default=None, help="Shortcut: set --hostname '*.mycompany.com' for owner auto-activation")
    parser.add_argument("--output", default=None, help="Output path (default: OS standard)")
    args = parser.parse_args()

    # Load private key
    private_path = Path(__file__).parent.parent / "keys" / "license_private.pem"
    if not private_path.exists():
        print(f"ERROR: Private key not found at {private_path}")
        print("Run scripts/gen-license-keys.py first.")
        sys.exit(1)

    private_pem = private_path.read_bytes()

    # Resolve fingerprint
    fingerprint = args.machine_fingerprint
    if args.hostname:
        fingerprint = args.hostname
        print(f"Using hostname pattern: {fingerprint}")

    # Create license
    lic_b64 = create_license_file(
        school_id=args.school_id,
        school_name=args.school_name,
        machine_fingerprint=fingerprint,
        valid_until=args.valid_until,
        private_key_pem=private_pem,
    )

    # Write
    if args.output:
        dest = args.output
        Path(dest).parent.mkdir(parents=True, exist_ok=True)
        Path(dest).write_text(lic_b64)
    else:
        dest = write_lic_file(lic_b64)

    # Decode for display
    decoded = json.loads(__import__("base64").b64decode(lic_b64))

    print(f"License file created: {dest}")
    print()
    print("Contents:")
    print(json.dumps(decoded["payload"], indent=2))
    print(f"Signature (b64): {decoded['signature'][:40]}...")


if __name__ == "__main__":
    main()
