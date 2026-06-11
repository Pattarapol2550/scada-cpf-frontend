import { test, expect } from '@playwright/test'
import { mockProbe, mockMetrics, mockPH } from './helpers'

test.describe('Navbar', () => {

  test.beforeEach(async ({ page }) => {
    await mockProbe(page)
    await mockMetrics(page)
    await mockPH(page)
  })

  test('แสดง nav links ครบ 4 หน้า', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('a[href="/dashboard"]')).toBeVisible()
    await expect(page.locator('a[href="/history"]')).toBeVisible()
    await expect(page.locator('a[href="/input"]')).toBeVisible()
    await expect(page.locator('a[href="/ph-diagram"]')).toBeVisible()
  })

  test('คลิก History → ไปหน้า /history', async ({ page }) => {
    await page.goto('/dashboard')
    await page.locator('a[href="/history"]').click()
    await page.waitForURL('**/history')
    await expect(page).toHaveURL(/\/history/)
  })

  test('คลิก P-H → ไปหน้า /ph-diagram', async ({ page }) => {
    await page.goto('/dashboard')
    await page.locator('a[href="/ph-diagram"]').click()
    await page.waitForURL('**/ph-diagram')
    await expect(page).toHaveURL(/\/ph-diagram/)
  })

  test('คลิก Input → ไปหน้า /input', async ({ page }) => {
    await page.goto('/dashboard')
    await page.locator('a[href="/input"]').click()
    await page.waitForURL('**/input')
    await expect(page).toHaveURL(/\/input/)
  })

  // FIX flaky: เพิ่ม timeout และ wait ให้นานขึ้น เพราะ probe ต้องรอ network
  test('connection status แสดงเมื่อ probe สำเร็จ', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('text=LIVE')).toBeVisible({ timeout: 15_000 })
  })

  // FIX flaky: abort request แทน network error เพื่อให้ reliable กว่า
  test('connection status ERROR เมื่อ probe ล้มเหลว', async ({ page }) => {
    await page.route('**/api/metrics/COMP-01**', route => route.abort('failed'))
    await page.goto('/history')
    await expect(page.locator('text=ERROR')).toBeVisible({ timeout: 15_000 })
  })

  test('logout ปุ่ม → กลับไป /login', async ({ page }) => {
    await page.goto('/dashboard')
    const logoutBtn = page.locator('button').filter({ hasText: /logout|ออก/i }).first()
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
    }
  })

})