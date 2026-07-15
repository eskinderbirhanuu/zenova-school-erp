import { test, expect } from "@playwright/test"

test.describe("Authentication flows", () => {
  test("login page renders and accepts credentials", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: /login|sign in/i })).toBeVisible()
    await page.fill('input[name="email"]', "admin@school.com")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|admin)/)
    expect(page.url()).not.toContain("/login")
  })

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "wrong@email.com")
    await page.fill('input[name="password"]', "badpassword")
    await page.click('button[type="submit"]')
    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible()
  })

  test("unauthenticated user redirected to login", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL(/login/)
  })
})
