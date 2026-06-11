import { test, expect } from '@playwright/test'
import { mockMetrics, mockProbe, MOCK_METRICS } from './helpers'

const MANY_RECORDS = Array.from({ length: 120 }, (_, i) => ({
  ...MOCK_METRICS[0],
  _id: `doc${i}`,
  timestamp: new Date(Date.now() - i * 60_000).toISOString(),
}))

test.describe('History Page', () => {

  test.beforeEach(async ({ page }) => {
    await mockProbe(page)
    await mockMetrics(page, 'COMP-01', MANY_RECORDS)
    await page.goto('/history')
    await page.waitForResponse(r => r.url().includes('/api/metrics'))
  })

  test('แสดง filter bar ครบ', async ({ page }) => {
    await expect(page.locator('select').first()).toBeVisible()
    await expect(page.locator('text=Live').first()).toBeVisible()
  })

  test('แสดงตารางข้อมูลพร้อม header columns', async ({ page }) => {
    await expect(page.locator('th').filter({ hasText: /Timestamp/i })).toBeVisible()
    await expect(page.locator('th').filter({ hasText: /COP/i })).toBeVisible()
  })

  // FIX: text จริงใน HistoryPage คือ "{records.length.toLocaleString()} records" ใน span
  // และบรรทัด "แสดง X–Y จาก Z records" → หาจาก pattern นี้แทน
  test('แสดงจำนวน record ที่ถูกต้อง', async ({ page }) => {
    // span ใน panel-header: "120 records"
    await expect(page.locator('text=/120.*records|records.*120/i').first()).toBeVisible({ timeout: 8_000 })
  })

  test('เปลี่ยน compressor → request ใหม่', async ({ page }) => {
    await mockMetrics(page, 'COMP-02', [])
    const reqP = page.waitForRequest(r => r.url().includes('/api/metrics/COMP-02'))
    await page.locator('select').first().selectOption('COMP-02')
    await reqP
  })

  // FIX: ปุ่มข้อความ "Live" ไม่ใช่ "Live Mode" → ใช้ exact match
  test('ปุ่ม Live toggle ทำงาน', async ({ page }) => {
    const liveBtn = page.locator('button').filter({ hasText: /^Live$/ }).first()
    await expect(liveBtn).toBeVisible()
    await liveBtn.click()
    // หลัง click off → ปุ่ม "Search" (🔍 Search) โผล่
    await expect(page.locator('button').filter({ hasText: /Search|Reset/i }).first()).toBeVisible({ timeout: 5_000 })
  })

  // FIX: ปุ่มชื่อ "Live" → click แล้ว datetime ไม่ disabled (opacity 0.6 แต่ไม่ใช่ disabled attr)
  test('สลับ Live off → แก้ datetime ได้ → เห็นปุ่ม Search', async ({ page }) => {
    const liveBtn = page.locator('button').filter({ hasText: /^Live$/ }).first()
    await liveBtn.click()
    // datetime input ต้องไม่มี disabled attribute
    const dtInput = page.locator('input[type="datetime-local"]').first()
    await expect(dtInput).not.toBeDisabled()
    // ปุ่ม Search ปรากฏ
    await expect(page.locator('button').filter({ hasText: /🔍.*Search|Search/i }).first()).toBeVisible()
  })

  test('Pagination แสดงเมื่อมี record > 50', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: '→' })).toBeVisible()
  })

  test('คลิก next page → แถวเปลี่ยน', async ({ page }) => {
    const firstRowBefore = await page.locator('tbody tr').first().textContent()
    await page.locator('button').filter({ hasText: '→' }).click()
    await page.waitForTimeout(200)
    const firstRowAfter = await page.locator('tbody tr').first().textContent()
    expect(firstRowBefore).not.toEqual(firstRowAfter)
  })

  test('ปุ่ม CSV export แสดงและ enabled', async ({ page }) => {
    const csvBtn = page.locator('button').filter({ hasText: /CSV/i })
    await expect(csvBtn).toBeVisible()
    await expect(csvBtn).not.toBeDisabled()
  })

  test('ปุ่ม Excel export แสดงและ enabled', async ({ page }) => {
    const xlsxBtn = page.locator('button').filter({ hasText: /Excel/i })
    await expect(xlsxBtn).toBeVisible()
    await expect(xlsxBtn).not.toBeDisabled()
  })

  test('คลิก CSV → download file', async ({ page }) => {
    const dl = page.waitForEvent('download')
    await page.locator('button').filter({ hasText: /CSV/i }).click()
    expect((await dl).suggestedFilename()).toMatch(/\.csv$/)
  })

  // FIX: empty state text จริงคือ "ไม่พบข้อมูลในช่วงเวลาที่เลือก"
  test('ไม่มีข้อมูล → แสดง empty state', async ({ page }) => {
    await mockMetrics(page, 'COMP-03', [])
    await page.locator('select').first().selectOption('COMP-03')
    await page.waitForResponse(r => r.url().includes('/api/metrics/COMP-03'))
    await expect(page.locator('text=ไม่พบข้อมูลในช่วงเวลาที่เลือก')).toBeVisible({ timeout: 8_000 })
  })

  test('COP trend chart render', async ({ page }) => {
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 })
  })

})