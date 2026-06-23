/**
 * 02-navbar.spec.ts — ทดสอบ Navbar กับ backend จริง (headed)
 */
import { test, expect } from '@playwright/test'

test.describe('Navbar', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    // รอให้หน้า load จริง ๆ
    await page.waitForLoadState('networkidle')
  })

  test('แสดง nav links ครบ 4 หน้า', async ({ page }) => {
    await expect(page.locator('a[href="/dashboard"]')).toBeVisible()
    await expect(page.locator('a[href="/history"]')).toBeVisible()
    await expect(page.locator('a[href="/input"]')).toBeVisible()
    await expect(page.locator('a[href="/ph-diagram"]')).toBeVisible()
  })

  test('connection status LIVE แสดงเมื่อ backend ตอบสนอง', async ({ page }) => {
    await expect(page.locator('text=LIVE')).toBeVisible({ timeout: 20_000 })
  })

  test('คลิก History → ไปหน้า /history', async ({ page }) => {
    await page.locator('a[href="/history"]').click()
    await page.waitForURL('**/history')
    await expect(page).toHaveURL(/\/history/)
  })

  test('คลิก P-H → ไปหน้า /ph-diagram', async ({ page }) => {
    await page.locator('a[href="/ph-diagram"]').click()
    await page.waitForURL('**/ph-diagram')
    await expect(page).toHaveURL(/\/ph-diagram/)
  })

  test('คลิก Input → ไปหน้า /input', async ({ page }) => {
    await page.locator('a[href="/input"]').click()
    await page.waitForURL('**/input')
    await expect(page).toHaveURL(/\/input/)
  })

  test('logout ปุ่ม → กลับไป /login', async ({ page }) => {
    const logoutBtn = page.locator('button').filter({ hasText: /logout|ออก/i }).first()
    await expect(logoutBtn).toBeVisible({ timeout: 8_000 })
    await logoutBtn.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })

  test('connection status ERROR เมื่อ API ล้มเหลว', async ({ page }) => {
    // ต้องไปหน้าอื่น (ไม่ใช่ Dashboard) เพราะ Dashboard ส่ง connStatusProp ให้ Navbar
    // ทำให้ probe ของ Navbar ถูก override → ไปหน้า /history แทนซึ่ง Navbar ใช้ probe ของตัวเอง
    await page.route('**/api/metrics/**', route => route.abort())
    await page.goto('/history')
    await expect(page.locator('text=ERROR')).toBeVisible({ timeout: 20_000 })
  })

})
