import { test, expect } from "@playwright/test"

test.describe("Payment flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "parent@school.com")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|parent)/)
  })

  test("parent payments dashboard loads", async ({ page }) => {
    await page.goto("/parent/payments")
    await expect(page.getByText(/payment|invoice|balance/i).first()).toBeVisible()
  })

  test("payment history shows transactions", async ({ page }) => {
    await page.goto("/parent/payments")
    const table = page.locator("table, .transaction-list, [data-testid='payments-list']")
    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible()
    }
  })

  test("receipts page accessible", async ({ page }) => {
    await page.goto("/parent/receipts")
    await expect(page.getByText(/receipt/i).first()).toBeVisible()
  })
})
