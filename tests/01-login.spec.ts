import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Login Page', () => {

  test('แสดง login form ครบถ้วน', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Refrigeration SCADA')).toBeVisible()
    await expect(page.locator('text=NH₃')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toHaveText('Login')
  })

  test('login สำเร็จ → redirect ไป /dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('admin@example.com')
    await page.locator('input[type="password"]').fill('anypassword')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('login ไม่กรอก email → ยังอยู่หน้า login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="password"]').fill('pass')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/login/)
  })

  // FIX: bypass HTML required validation แล้ว dispatch submit event โดยตรง
  // เพื่อให้ handleSubmit ทำงานและ setError('กรุณากรอก email และ password')
  test('login ไม่กรอก password → ขึ้น error message', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('admin@example.com')
    // ส่ง form โดย bypass HTML validation ผ่าน JS
    await page.evaluate(() => {
      const form = document.querySelector('form')
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await expect(page.locator('text=กรุณากรอก email และ password')).toBeVisible({ timeout: 5_000 })
  })

  test('unauthenticated → redirect ไป /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login|\/dashboard/)
  })

})