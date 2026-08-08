import { test, expect } from "@playwright/test"

test.describe("NFC Card Operations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "registrar@school.com")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|registrar)/)
  })

  test("NFC scanning page loads for registrar", async ({ page }) => {
    await page.goto("/registrar/nfc")
    await expect(page.getByRole("heading", { name: /nfc card management/i })).toBeVisible({ timeout: 15000 })
  })

  test("QR code page loads for registrar", async ({ page }) => {
    await page.goto("/registrar/qr")
    await expect(page.getByRole("heading", { name: /qr code generation/i })).toBeVisible({ timeout: 15000 })
  })
})
