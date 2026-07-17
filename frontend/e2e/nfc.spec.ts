import { test, expect } from "@playwright/test"

test.describe("NFC Card Operations", () => {
  test("NFC scanning page loads for registrar", async ({ page }) => {
    await page.goto("/registrar/nfc")
    await expect(page.getByText(/nfc|card|scan/i)).toBeVisible({ timeout: 15000 })
  })

  test("QR code page loads for registrar", async ({ page }) => {
    await page.goto("/registrar/qr")
    await expect(page.getByText(/qr|code|generate/i)).toBeVisible({ timeout: 15000 })
  })
})
