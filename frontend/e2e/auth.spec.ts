import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("login page loads and shows email/password fields", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
  })

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill("invalid@test.com")
    await page.getByLabel(/password/i).fill("wrongpassword")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 })
  })

  test("forgot password link navigates correctly", async ({ page }) => {
    await page.goto("/login")
    await page.getByText(/forgot/i).click()
    await expect(page).toHaveURL(/forgot-password/)
    await expect(page.getByRole("heading", { name: /reset|forgot/i })).toBeVisible()
  })

  test("unauthenticated user redirected to login", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL(/login/, { timeout: 10000 })
  })

  test("unauthorized role sees 403 page", async ({ page }) => {
    await page.goto("/unauthorized")
    await expect(page.getByText(/unauthorized|access denied/i)).toBeVisible()
  })
})
