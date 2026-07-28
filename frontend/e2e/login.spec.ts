import { test, expect } from "@playwright/test"

test.describe("Login flow", () => {
  test("shows login form", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "wrong@email.com")
    await page.fill('input[name="password"]', "wrongpassword")
    await page.click('button[type="submit"]')
    await expect(page.locator("text=Invalid credentials").or(page.locator("[role='alert']"))).toBeVisible({ timeout: 10000 })
  })

  test("redirects to dashboard on success", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "admin@zenova.app")
    await page.fill('input[name="password"]', "admin123")
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  })
})