# License System

## Overview

V2 256-bit key system with hardware binding and offline grace. System is locked until activation.

## Activation Flow

1. Enter Main License Key
2. Enter Branch License Key
3. Create School
4. Create Branch
5. Create Admin
6. Setup Wizard complete → system unlocked

## License Types

- **Trial** — Time-limited evaluation
- **Monthly** — 30-day renewable
- **Yearly** — 365-day renewable
- **Lifetime** — No expiration

## License Statuses

`Active`, `Expired`, `Suspended`, `Revoked`

## Key Format

`ZNV-A1B2-C3D4-E5F6-ABCD` (Main), `ZNV-DCBA-6F5E-4D3C-2B1A` (Branch)

## Key Generation (V2)

- School name + UUID → SHA-256 → segment A
- AES-256 encrypted payload with embedded RSA public key
- Base32 encoded output
- Signature: RSA-2048 with PSS padding

## Machine Fingerprinting

Hardware binding via composite hash:
- MAC address (primary interface)
- CPU serial (Linux `/proc/cpuinfo`)
- Machine ID (`/etc/machine-id`)
- Disk serial (`udevadm`)
- Combined → SHA-256 → 8-char short fingerprint

## License Validation at Startup

1. Find active license record
2. Check expiry date
3. Verify hardware fingerprint against current machine
4. Check offline grace period (45 days max)
5. Return status with restriction flags

## Offline Grace Period

- First boot without internet: `offline_grace_start` recorded
- Days 1–45: Full access
- Each day checks online connectivity
- If online found → reset grace counter
- Day 46+: LOCKED until .lic file renewed

## Anti-Piracy / Watermarking

### 8 Watermark Locations
| # | Location | Method |
|---|----------|--------|
| 1 | backend/.env | `SCHOOL_WATERMARK` env var |
| 2 | Frontend JS bundle | `window.__ZENOVA_SCHOOL__` |
| 3 | Database seed data | Unique honeytoken student names |
| 4 | License key | Public key encodes school code |
| 5 | API response header | `X-Zenova-Instance` (encrypted) |
| 6 | Docker image label | `LABEL zenova.school` |
| 7 | Database column name | Decoy column in schools table |
| 8 | QR code on login page | Tiny dot pattern watermark |

### Honeytoken Records
Each school gets unique seed data (students, parents, invoices, books). When a cracked version is found, search for these strings to identify the source school.

### Incident Response
1. Cracked version discovered
2. Inspect: JS bundle, Docker labels, API headers, DB dump
3. Match against honeytoken dictionary
4. Identify the source school
5. Action: Revoke license, legal notice, blacklist from updates

## Feature Locking

Licensed features (locked without valid license):
- NFC Attendance
- QR Code Scan
- Excel/CSV Import
- ID Card Print

Backend enforcement via `require_licensed_feature()` dependency. Frontend enforcement via `checkFeatureAccess()` API call. License status cached in Redis (1-hour TTL).
