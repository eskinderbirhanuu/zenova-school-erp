import { test, expect } from "@playwright/test"

test.describe("Dashboard smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "admin@zenova.app")
    await page.fill('input[name="password"]', "admin123")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|admin)/)
  })

  test("loads dashboard with KPIs", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await expect(page.getByRole("heading", { name: /control center/i })).toBeVisible()
  })

  test("sidebar navigation works", async ({ page }) => {
    await page.goto("/admin/dashboard")
    const nav = page.getByRole("navigation", { name: "Main navigation" })
    await expect(nav).toBeVisible()
  })
})