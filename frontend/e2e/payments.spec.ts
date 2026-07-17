import { test, expect } from "@playwright/test"

test.describe("Payment Flows", () => {
  test("parent payment page has payment method options", async ({ page }) => {
    await page.goto("/parent/payments")
    await expect(page.getByText(/payment|invoice|bill/i)).toBeVisible({ timeout: 15000 })
  })

  test("payment success page shows confirmation", async ({ page }) => {
    await page.goto("/parent/payment/success?session_id=test-session")
    await expect(page.getByText(/success|confirmed|receipt/i)).toBeVisible({ timeout: 10000 })
  })

  test("payment failed page shows error", async ({ page }) => {
    await page.goto("/parent/payment/failed")
    await expect(page.getByText(/fail|cancel|error/i)).toBeVisible({ timeout: 10000 })
  })
})
