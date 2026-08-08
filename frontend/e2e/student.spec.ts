import { test, expect } from "@playwright/test"

test.describe("Student flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "student@school.com")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|student)/)
  })

  test("student dashboard shows schedule", async ({ page }) => {
    await page.goto("/student/dashboard")
    await expect(page.getByText(/schedule|timetable|class/i).first()).toBeVisible({ timeout: 10000 })
  })

  test("student grades page loads", async ({ page }) => {
    await page.goto("/student/results")
    await expect(page.getByText(/grade|result|score|subject/i).first()).toBeVisible({ timeout: 10000 })
  })

  test("student attendance page loads", async ({ page }) => {
    await page.goto("/student/attendance")
    await expect(page.getByText(/attendance|present|absent/i).first()).toBeVisible({ timeout: 10000 })
  })
})