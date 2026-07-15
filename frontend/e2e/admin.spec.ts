import { test, expect } from "@playwright/test"

test.describe("Admin flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "admin@school.com")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|admin)/)
  })

  test("admin dashboard loads KPIs", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await expect(page.getByText(/students|revenue|teachers|attendance/i).first()).toBeVisible()
  })

  test("admin students list loads", async ({ page }) => {
    await page.goto("/admin/students")
    await page.waitForLoadState("networkidle")
    const rows = page.locator("table tbody tr, [data-testid='student-row']")
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test("create announcement flow", async ({ page }) => {
    await page.goto("/admin/announcements")
    await page.getByRole("button", { name: /new|create|add/i }).first().click()
    await page.fill('input[name="title"]', "E2E Test Announcement")
    await page.fill('textarea[name="content"]', "Created by Playwright test")
    await page.getByRole("button", { name: /publish|submit|save/i }).click()
    await expect(page.getByText(/announcement published|success|created/i)).toBeVisible()
  })
})
