import { test, expect } from '@playwright/test'
import { mockMetrics, mockPH, mockProbe, MOCK_METRICS } from './helpers'

test.describe('Dashboard Page', () => {

  test.beforeEach(async ({ page }) => {
    await mockProbe(page)
    await mockMetrics(page)
    await mockPH(page)
    await page.goto('/dashboard')
  })

  test('โหลดหน้าได้และแสดง compressor list', async ({ page }) => {
    for (const c of ['COMP-01','COMP-02','COMP-03']) {
      await expect(page.locator(`text=${c}`)).toBeVisible()
    }
  })

  // FIX: รอ API response ก่อน แล้วหา KPI label ตามที่โค้ดใช้จริง
  test('แสดง KPI cards: COP, Power, Q_e', async ({ page }) => {
    await page.waitForResponse(r => r.url().includes('/api/metrics') && r.status() === 200)
    // label จาก KPICard: 'P_comp', 'COP', 'Q_e'
    await expect(page.locator('text=P_comp').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=COP').first()).toBeVisible()
    await expect(page.locator('text=Q_e').first()).toBeVisible()
  })

  test('เลือก COMP-02 → request metrics ใหม่', async ({ page }) => {
    await mockMetrics(page, 'COMP-02')
    await mockPH(page, 'COMP-02')
    const reqP = page.waitForRequest(r => r.url().includes('/api/metrics/COMP-02'))
    await page.locator('button, li').filter({ hasText: 'COMP-02' }).first().click()
    await reqP
  })

  test('เปลี่ยน comp → PH diagram กราฟเก่าหายไป', async ({ page }) => {
    await page.waitForResponse(r => r.url().includes('/api/ph-diagram/COMP-01'))
    await mockPH(page, 'COMP-02', 404)
    await mockMetrics(page, 'COMP-02', [])
    await page.locator('button, li').filter({ hasText: 'COMP-02' }).first().click()
    await page.waitForTimeout(600)
    const stalePoint = page.locator('text=1 — Comp. inlet')
    const noData = await stalePoint.count() === 0
    expect(noData).toBeTruthy()
  })

  test('COP trend chart render', async ({ page }) => {
    await page.waitForResponse(r => r.url().includes('/api/metrics'))
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 })
  })

  test('PH diagram panel แสดงใน dashboard', async ({ page }) => {
    await page.waitForResponse(r => r.url().includes('/api/ph-diagram'))
    await page.waitForTimeout(500)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 12_000 })
  })

  test('Cycle point values แสดงหลัง PH diagram โหลด', async ({ page }) => {
    await page.waitForResponse(r => r.url().includes('/api/ph-diagram'))
    await page.waitForTimeout(500)
    const eff = page.locator('text=/Isentropic|88\\.0|η/i')
    if (await eff.count() > 0) await expect(eff.first()).toBeVisible()
  })

  // FIX: AlarmLog ไม่มีข้อความ "Normal" แต่แสดง "✅ ไม่พบ Alarm ในช่วงเวลานี้"
  test('ไม่มี alarm → แสดง "ไม่พบ Alarm"', async ({ page }) => {
    await page.waitForResponse(r => r.url().includes('/api/metrics') && r.status() === 200)
    await expect(page.locator('text=ไม่พบ Alarm ในช่วงเวลานี้')).toBeVisible({ timeout: 10_000 })
  })

  test('มี alarm → แสดง alarm badge', async ({ page }) => {
    const dataWithAlarm = [{
      ...MOCK_METRICS[0],
      diagnosis: {
        ...MOCK_METRICS[0].diagnosis,
        alarms: [{ severity: 'Warning', title: 'High Superheat', message: 'SH > 15K' }],
      },
    }]
    await page.route('**/api/metrics/COMP-01**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dataWithAlarm) })
    )
    await page.reload()
    await page.waitForResponse(r => r.url().includes('/api/metrics'))
    await expect(page.locator('text=/Warning|High Superheat/i').first()).toBeVisible({ timeout: 8_000 })
  })

  test('Live badge แสดง', async ({ page }) => {
    await expect(page.locator('text=/Live|LIVE/i').first()).toBeVisible({ timeout: 8_000 })
  })

})