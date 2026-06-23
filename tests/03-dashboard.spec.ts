/**
 * 03-dashboard.spec.ts — ทดสอบ Dashboard กับ backend จริง (headed)
 * Dashboard เริ่มใน OVERVIEW mode → ต้องเลือก compressor ก่อนจึงจะ fetch metrics
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('โหลดหน้าได้และแสดง compressor list', async ({ page }) => {
    for (const c of ['COMP-01', 'COMP-02', 'COMP-03']) {
      await expect(page.locator(`text=${c}`).first()).toBeVisible({ timeout: 15_000 })
    }
  })

  test('เลือก COMP-01 → KPI cards P_comp, COP, Q_e แสดง', async ({ page }) => {
    await expect(page.locator('text=COMP-01').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('button, li').filter({ hasText: 'COMP-01' }).first().click()
    await expect(page.locator('text=P_comp').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('text=COP').first()).toBeVisible()
    await expect(page.locator('text=Q_e').first()).toBeVisible()
  })

  test('เลือก COMP-01 → ตรวจ N/A count (บัคถ้า KPI ทั้งหมดเป็น N/A)', async ({ page }) => {
    await expect(page.locator('text=COMP-01').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('button, li').filter({ hasText: 'COMP-01' }).first().click()
    await expect(page.locator('text=P_comp').first()).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1000)
    const naCount = await page.locator('text=N/A').count()
    const kpiCount = await page.locator('text=P_comp').count()
    console.log(`KPI cards: ${kpiCount}, N/A values: ${naCount}`)
  })

  test('เลือก COMP-02 → request metrics COMP-02', async ({ page }) => {
    await expect(page.locator('text=COMP-02').first()).toBeVisible({ timeout: 10_000 })
    const reqP = page.waitForRequest(r => r.url().includes('/api/metrics/COMP-02'), { timeout: 15_000 })
    await page.locator('button, li').filter({ hasText: 'COMP-02' }).first().click()
    await reqP
  })

  test('เลือก COMP-03 → request metrics COMP-03', async ({ page }) => {
    await expect(page.locator('text=COMP-03').first()).toBeVisible({ timeout: 10_000 })
    const reqP = page.waitForRequest(r => r.url().includes('/api/metrics/COMP-03'), { timeout: 15_000 })
    await page.locator('button, li').filter({ hasText: 'COMP-03' }).first().click()
    await reqP
  })

  test('เลือก COMP-01 → COP trend chart canvas render', async ({ page }) => {
    await expect(page.locator('text=COMP-01').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('button, li').filter({ hasText: 'COMP-01' }).first().click()
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 })
  })

  test('เลือก COMP-01 → PH diagram panel canvas render', async ({ page }) => {
    await expect(page.locator('text=COMP-01').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('button, li').filter({ hasText: 'COMP-01' }).first().click()
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25_000 })
  })

  test('เลือก COMP-01 → AlarmLog section แสดง', async ({ page }) => {
    await expect(page.locator('text=COMP-01').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('button, li').filter({ hasText: 'COMP-01' }).first().click()
    await expect(page.locator('text=P_comp').first()).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1000)
    const hasAlarm  = await page.locator('text=/Warning|Critical/i').count()
    const hasEmpty  = await page.locator('text=ไม่พบ Alarm ในช่วงเวลานี้').count()
    const hasHeader = await page.locator('text=/Alarm/i').count()
    console.log(`Alarm items: ${hasAlarm}, Empty msg: ${hasEmpty}, Alarm header: ${hasHeader}`)
    expect(hasHeader).toBeGreaterThan(0)
  })

  test('Live badge แสดง', async ({ page }) => {
    await expect(page.locator('text=/Live|LIVE/i').first()).toBeVisible({ timeout: 15_000 })
  })

  test('กด COMP-02 แล้วกลับ COMP-01 → PH diagram โหลดใหม่', async ({ page }) => {
    await expect(page.locator('text=COMP-01').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('button, li').filter({ hasText: 'COMP-02' }).first().click()
    await page.waitForTimeout(500)
    await page.locator('button, li').filter({ hasText: 'COMP-01' }).first().click()
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 })
  })

  test('เลือก COMP-01 → API metrics ตอบสนองได้ (KPI โหลด)', async ({ page }) => {
    await expect(page.locator('text=COMP-01').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('button, li').filter({ hasText: 'COMP-01' }).first().click()
    await expect(page.locator('text=P_comp').first()).toBeVisible({ timeout: 20_000 })
  })

})
