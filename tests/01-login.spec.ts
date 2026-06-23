/**
 * 01-login.spec.ts — ทดสอบหน้า Login กับ backend จริง (headed)
 */
import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Login Page', () => {

  test('แสดง logo และปุ่ม Sign in with Google', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Refrigeration SCADA')).toBeVisible()
    await expect(page.locator('text=NH₃')).toBeVisible()
    await expect(page.locator('button', { hasText: 'Sign in with Google' })).toBeVisible()
  })

  test('ฟอร์ม username/password ซ่อนอยู่ตอนแรก', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="text"]')).not.toBeVisible()
    await expect(page.locator('input[type="password"]')).not.toBeVisible()
  })

  test('กดปุ่ม "เข้าสู่ระบบด้วยรหัสผ่าน" → ฟอร์มโผล่', async ({ page }) => {
    await page.goto('/login')
    await page.locator('button', { hasText: 'เข้าสู่ระบบด้วยรหัสผ่าน' }).click()
    await expect(page.locator('input[type="text"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('login สำเร็จด้วย admin3 → redirect ไป /dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.locator('button', { hasText: 'เข้าสู่ระบบด้วยรหัสผ่าน' }).click()
    await page.locator('input[type="text"]').fill('admin3')
    await page.locator('input[type="password"]').fill('Admin12345')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('password ผิด → แสดง error message', async ({ page }) => {
    await page.goto('/login')
    await page.locator('button', { hasText: 'เข้าสู่ระบบด้วยรหัสผ่าน' }).click()
    await page.locator('input[type="text"]').fill('admin3')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('text=ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('ไม่กรอกอะไร → ขึ้น error validation', async ({ page }) => {
    await page.goto('/login')
    await page.locator('button', { hasText: 'เข้าสู่ระบบด้วยรหัสผ่าน' }).click()
    // bypass HTML5 required validation → trigger JS handler โดยตรง
    await page.evaluate(() => {
      const form = document.querySelector('form')
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await expect(page.locator('text=กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน')).toBeVisible({ timeout: 5_000 })
  })

  test('ปุ่ม "ยกเลิก" → ซ่อนฟอร์มกลับ', async ({ page }) => {
    await page.goto('/login')
    await page.locator('button', { hasText: 'เข้าสู่ระบบด้วยรหัสผ่าน' }).click()
    await expect(page.locator('input[type="text"]')).toBeVisible()
    await page.locator('button', { hasText: 'ยกเลิก' }).click()
    await expect(page.locator('input[type="text"]')).not.toBeVisible()
  })

  test('กด submit → ปุ่มเปลี่ยนเป็น "กำลังเข้าสู่ระบบ…"', async ({ page }) => {
    await page.goto('/login')
    await page.locator('button', { hasText: 'เข้าสู่ระบบด้วยรหัสผ่าน' }).click()
    await page.locator('input[type="text"]').fill('admin3')
    await page.locator('input[type="password"]').fill('Admin12345')
    // click แล้ว assert loading state ทันที
    const clickP = page.locator('button[type="submit"]').click()
    await expect(page.locator('button[type="submit"]')).toHaveText('กำลังเข้าสู่ระบบ…')
    await clickP
  })

  test('unauthenticated → redirect ไป /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

})
