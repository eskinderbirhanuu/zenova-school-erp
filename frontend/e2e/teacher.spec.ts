import { test, expect } from "@playwright/test"

test.describe("Teacher flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "teacher@school.com")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|teacher)/)
  })

  test("teacher dashboard shows schedule", async ({ page }) => {
    await page.goto("/teacher/dashboard")
    await expect(page.getByText(/timetable|schedule|class/i).first()).toBeVisible({ timeout: 10000 })
  })

  test("attendance marking page loads", async ({ page }) => {
    await page.goto("/teacher/attendance/mark")
    await expect(page.getByText(/attendance|mark|student/i).first()).toBeVisible({ timeout: 10000 })
  })

  test("grade entry page loads", async ({ page }) => {
    await page.goto("/teacher/grades/enter")
    await expect(page.getByText(/grade|score|exam/i).first()).toBeVisible({ timeout: 10000 })
  })
})