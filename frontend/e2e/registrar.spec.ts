import { test, expect } from "@playwright/test"

test.describe("Registrar flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "registrar@school.com")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|registrar)/)
  })

  test("registrar dashboard shows enrollment stats", async ({ page }) => {
    await page.goto("/registrar/dashboard")
    await expect(page.getByText(/student|enrollment|registration/i).first()).toBeVisible({ timeout: 10000 })
  })

  test("student registration page loads", async ({ page }) => {
    await page.goto("/registrar/students/new")
    await expect(page.getByRole("heading", /register|new student/i)).toBeVisible({ timeout: 10000 })
  })

  test("transfers page loads", async ({ page }) => {
    await page.goto("/registrar/transfers")
    await expect(page.getByText(/transfer/i).first()).toBeVisible({ timeout: 10000 })
  })
})