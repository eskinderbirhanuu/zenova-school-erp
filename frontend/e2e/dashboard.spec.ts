import { test, expect } from "@playwright/test"

test.describe("Role-Based Dashboard Access", () => {
  test("public routes are accessible without auth", async ({ page }) => {
    await page.goto("/about")
    await expect(page).toHaveURL(/about/)
    await expect(page.getByText(/zenova/i)).toBeVisible()
  })

  test("login page accessible without auth", async ({ page }) => {
    await page.goto("/login")
    await expect(page).toHaveURL(/login/)
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
  })

  test("documentation page loads", async ({ page }) => {
    await page.goto("/documentation")
    await expect(page.getByText(/zenova/i)).toBeVisible()
  })
})
