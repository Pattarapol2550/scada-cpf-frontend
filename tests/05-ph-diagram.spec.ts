import { test, expect } from '@playwright/test'
import { mockPH, mockProbe } from './helpers'

test.describe('PH Diagram Page', () => {

  test.beforeEach(async ({ page }) => {
    await mockProbe(page)
    await mockPH(page, 'COMP-01')
    await page.goto('/ph-diagram')
    await page.waitForResponse(r => r.url().includes('/api/ph-diagram'))
  })

  test('แสดง panel title "P-H Diagram"', async ({ page }) => {
    await expect(page.locator('text=/P-H Diagram/i')).toBeVisible()
  })

  test('แสดง compressor select dropdown', async ({ page }) => {
    const select = page.locator('select').first()
    await expect(select).toBeVisible()
    await expect(select).toHaveValue('COMP-01')
  })

  test('render chart canvas', async ({ page }) => {
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 })
  })

  test('แสดง Cycle Point cards (Point 1–4)', async ({ page }) => {
    await expect(page.locator('text=Point 1')).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('text=Point 2')).toBeVisible()
    await expect(page.locator('text=Point 3')).toBeVisible()
    await expect(page.locator('text=Point 4')).toBeVisible()
  })

  // FIX: text จริงคือ "Isentropic efficiency: " (ตัวเล็ก e) ไม่ใช่ "Isentropic Efficiency"
  // และค่าจาก mock คือ 0.88 → แสดง "88.0 %"
  test('แสดง Isentropic efficiency', async ({ page }) => {
    await expect(page.locator('text=Isentropic efficiency:')).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('text=88.0 %')).toBeVisible()
  })

  test('แสดง legend: Saturation dome + Cycle', async ({ page }) => {
    await expect(page.locator('text=Saturation dome')).toBeVisible()
    await expect(page.locator('text=Cycle')).toBeVisible()
  })

  test('เปลี่ยน comp → loading state ก่อน → กราฟใหม่', async ({ page }) => {
    await mockPH(page, 'COMP-02')
    const reqP = page.waitForRequest(r => r.url().includes('/api/ph-diagram/COMP-02'))
    await page.locator('select').first().selectOption('COMP-02')
    await reqP
    await page.waitForResponse(r => r.url().includes('/api/ph-diagram/COMP-02'))
    await expect(page.locator('text=/P-H Diagram.*COMP-02/i')).toBeVisible({ timeout: 8_000 })
  })

  test('เปลี่ยน comp → ไม่มีข้อมูล → กราฟเก่าหาย', async ({ page }) => {
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8_000 })
    await mockPH(page, 'COMP-02', 404)
    await page.locator('select').first().selectOption('COMP-02')
    await page.waitForResponse(r => r.url().includes('/api/ph-diagram/COMP-02'))
    await expect(page.locator('text=🔍')).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('canvas')).not.toBeVisible()
  })

  test('ปุ่ม "เจาะเวลา" toggle แสดง/ซ่อน datetime input', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: /ระบุเวลา/ })
    await expect(toggleBtn).toBeVisible()
    await expect(page.locator('input[type="datetime-local"]')).not.toBeVisible()
    await toggleBtn.click()
    await expect(page.locator('input[type="datetime-local"]')).toBeVisible()
  })

  // FIX: ปุ่มชื่อ "🔍 ดึงข้อมูล" → ใช้ text match ที่ตรงขึ้น
  // และต้อง intercept /api/ph-diagram/COMP-01?timestamp=...
  test('timestamp mode: กด ดึงข้อมูล → request ถูก call', async ({ page }) => {
    await page.locator('button').filter({ hasText: /ระบุเวลา/ }).click()
    // override mock ให้รับ timestamp param ด้วย
    await page.route('**/api/ph-diagram/COMP-01**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        compressor_id: 'COMP-01', timestamp: new Date().toISOString(),
        saturation_dome: { liquid: [], vapour: [], critical: { h: 788, p: 11.3 } },
        cycle: { isentropic_efficiency: 0.88 },
      })})
    )
    const reqP = page.waitForRequest(r =>
      r.url().includes('/api/ph-diagram/COMP-01') && r.url().includes('timestamp')
    )
    // กด "🔍 ดึงข้อมูล" button
    await page.locator('button').filter({ hasText: 'ดึงข้อมูล' }).click()
    await reqP
  })

  test('timestamp mode: แสดง badge "เลือกเวลา"', async ({ page }) => {
    await page.locator('button').filter({ hasText: /ระบุเวลา/ }).click()
    await expect(page.locator('text=เลือกเวลา')).toBeVisible()
  })

  // FIX: error text จริงคือ "ไม่พบข้อมูลของ COMP-01 ในช่วงเวลาที่เลือก" (จาก backend detail)
  // และ "ลองเลือกเวลาอื่น หรือตรวจสอบว่ามีข้อมูลในช่วงนั้น"
  test('timestamp 404 → แสดง error พร้อมเวลาที่เลือก', async ({ page }) => {
    await page.route('**/api/ph-diagram/COMP-01**', route =>
      route.fulfill({
        status: 404, contentType: 'application/json',
        body: JSON.stringify({ detail: 'ไม่พบข้อมูลของ COMP-01 ในช่วงเวลาที่เลือก' }),
      })
    )
    await page.locator('button').filter({ hasText: /ระบุเวลา/ }).click()
    await page.locator('button').filter({ hasText: 'ดึงข้อมูล' }).click()
    await expect(page.locator('text=ไม่พบข้อมูลของ COMP-01 ในช่วงเวลาที่เลือก')).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('text=ลองเลือกเวลาอื่น หรือตรวจสอบว่ามีข้อมูลในช่วงนั้น')).toBeVisible()
  })

  test('ปิด timestamp mode → กลับเป็น latest', async ({ page }) => {
    const btn = page.locator('button').filter({ hasText: /ระบุเวลา/ })
    await btn.click()
    await btn.click()
    await expect(page.locator('input[type="datetime-local"]')).not.toBeVisible()
  })

  test('ปุ่ม PDF export แสดงและ enabled เมื่อมีข้อมูล', async ({ page }) => {
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8_000 })
    const pdfBtn = page.locator('button').filter({ hasText: /PDF/i })
    await expect(pdfBtn).toBeVisible()
    await expect(pdfBtn).not.toBeDisabled()
  })

  test('PDF export → download file .pdf', async ({ page }) => {
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 })
    const dl = page.waitForEvent('download')
    await page.locator('button').filter({ hasText: /⬇.*PDF|PDF/i }).click()
    const download = await dl
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
    expect(download.suggestedFilename()).toContain('COMP-01')
  })

  test('API error → แสดง error message', async ({ page }) => {
    await page.route('**/api/ph-diagram/**', route => route.abort())
    await page.goto('/ph-diagram')
    await expect(page.locator('text=/ไม่สามารถโหลด/i').first()).toBeVisible({ timeout: 8_000 })
  })

})