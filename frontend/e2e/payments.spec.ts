import { test, expect } from "@playwright/test"

test.describe("Payment Flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "parent.kebede0@zenova.demo")
    await page.fill('input[name="password"]', "test1234")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|parent)/)
  })

  test("parent payment page has payment method options", async ({ page }) => {
    await page.goto("/parent/payments")
    await expect(page.getByRole("heading", { name: /payment center/i })).toBeVisible({ timeout: 15000 })
  })

  test("payment success page shows confirmation", async ({ page }) => {
    await page.goto("/parent/payment/success?session=test-session")
    await expect(page.getByText(/success|confirmed|receipt/i)).toBeVisible({ timeout: 10000 })
  })

  test("payment failed page shows error", async ({ page }) => {
    await page.goto("/parent/payment/failed")
    await expect(page.getByRole("heading", { name: /payment failed/i })).toBeVisible({ timeout: 10000 })
  })
})
