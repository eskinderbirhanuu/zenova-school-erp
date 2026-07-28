import { test, expect } from "@playwright/test"

test.describe("Dashboard smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard")
  })

  test("loads dashboard with KPIs", async ({ page }) => {
    await expect(page.locator("h1, .page-header-title")).toContainText(/Dashboard/i)
  })

  test("sidebar navigation works", async ({ page }) => {
    const nav = page.locator("nav, aside, [role='navigation']")
    await expect(nav).toBeVisible()
  })
})