import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("login page loads and shows email/password fields", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByText(/sign in/i).first()).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible()
  })

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login")
    await page.locator('input[name="email"]').fill("invalid@test.com")
    await page.locator('input[name="password"]').fill("wrongpassword")
    await page.getByRole("button", { name: "Sign In", exact: true }).click()
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 })
  })

  test("forgot password link navigates correctly", async ({ page }) => {
    await page.goto("/login")
    await page.getByText(/forgot/i).click()
    await expect(page).toHaveURL(/forgot-password/)
    await expect(page.getByText(/forgot password|reset/i).first()).toBeVisible()
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
