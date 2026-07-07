# NFC Hardware Recommendations

## Card Tiers

### Standard — MIFARE Classic 1K (S50)
- **Cost**: ~$0.50–$1.00 per card
- **Capacity**: 1 KB EEPROM
- **Security**: Weak (CRYPTO1, known attacks)
- **Use case**: Default for all students/staff/parents/employees
- **Note**: 7-byte UID (4-byte NUID on newer batches)
- **Reader compatibility**: Most RFID readers (RC522, PN532, ACR122U)

### Premium — MIFARE DESFire EV2/EV3
- **Cost**: ~$2.00–$5.00 per card
- **Capacity**: 2–8 KB EEPROM
- **Security**: Strong (AES-128/3DES, mutual authentication)
- **Use case**: Upgrade when budget allows
- **Note**: 7-byte UID, backward-compatible with same readers
- **Benefit**: Encrypted data sectors, anti-cloning protection

## Card UID Format
- All cards expose a unique 7-byte UID read as hex: `04:A7:12:9C:B1`
- The system uses `card_uid` (string) as the external identifier
- Never store PII inside the NFC chip; the UID is the lookup key

## Recommended Readers
| Reader | Interface | Cost | Supports |
|--------|-----------|------|----------|
| RC522 | SPI/I2C | $3 | MIFARE Classic only |
| PN532 | I2C/SPI/UART | $10 | Classic + DESFire |
| ACR122U | USB (CCID) | $30 | Classic + DESFire |

## Deployment Notes
- **Default**: All cards assigned as `card_tier: "standard"` (MIFARE Classic)
- **Upgrade path**: Reassign with `card_tier: "premium"` when DESFire cards are procured
- The NFC scan function is hardware-agnostic — reads UID from any card type
- Card tier is informational (displayed in Card Designer preview, stored per card record)
