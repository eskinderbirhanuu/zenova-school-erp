import { test as setup, expect } from "@playwright/test"

const AUTH_FILE = ".auth/user.json"

setup("authenticate as super admin", async ({ page }) => {
  const email = process.env.E2E_EMAIL || "admin@zenova.app"
  const password = process.env.E2E_PASSWORD || "admin123"

  await page.goto("/login")
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/)

  await expect(page.locator("text=Dashboard")).toBeVisible()
  await page.context().storageState({ path: AUTH_FILE })
})