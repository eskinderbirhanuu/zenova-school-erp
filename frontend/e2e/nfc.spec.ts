import { test, expect } from "@playwright/test"

test.describe("NFC card flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "admin@school.com")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|admin)/)
  })

  test("bulk NFC assignment page loads", async ({ page }) => {
    await page.goto("/corporate/bulk-assign")
    await expect(page.getByText(/nfc|card|assign/i).first()).toBeVisible()
  })

  test("card printing page lists requests", async ({ page }) => {
    await page.goto("/corporate/card-printing")
    await page.waitForLoadState("networkidle")
    await expect(page.getByText(/card|printing/i).first()).toBeVisible()
  })
})
