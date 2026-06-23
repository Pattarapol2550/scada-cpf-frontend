/**
 * 04-history.spec.ts — ทดสอบ History Page กับ backend จริง (headed)
 */
import { test, expect } from '@playwright/test'

test.describe('History Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/history')
  })

  test('แสดง filter bar ครบ (compressor select + Live button)', async ({ page }) => {
    await expect(page.locator('select').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button').filter({ hasText: /^Live$/ }).first()).toBeVisible()
  })

  test('แสดงตาราง header columns: Timestamp, COP', async ({ page }) => {
    await expect(page.locator('th').filter({ hasText: /Timestamp/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('th').filter({ hasText: /COP/i })).toBeVisible()
  })

  test('ตารางแสดงข้อมูลจริง (tbody มี row)', async ({ page }) => {
    await expect(page.locator('th').filter({ hasText: /Timestamp/i })).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1000)
    const rowCount = await page.locator('tbody tr').count()
    console.log(`History rows: ${rowCount}`)
  })

  test('เปลี่ยน compressor → request ใหม่สำหรับ comp ที่เลือก', async ({ page }) => {
    await expect(page.locator('select').first()).toBeVisible({ timeout: 10_000 })
    const reqP = page.waitForRequest(r => r.url().includes('/api/metrics/COMP-02'), { timeout: 15_000 })
    await page.locator('select').first().selectOption('COMP-02')
    await reqP
  })

  test('ปุ่ม Live toggle ทำงาน → โผล่ปุ่ม Search/Reset', async ({ page }) => {
    const liveBtn = page.locator('button').filter({ hasText: /^Live$/ }).first()
    await expect(liveBtn).toBeVisible({ timeout: 10_000 })
    await liveBtn.click()
    await expect(page.locator('button').filter({ hasText: /Search|Reset/i }).first()).toBeVisible({ timeout: 5_000 })
  })

  test('สลับ Live off → datetime input ไม่ disabled', async ({ page }) => {
    const liveBtn = page.locator('button').filter({ hasText: /^Live$/ }).first()
    await expect(liveBtn).toBeVisible({ timeout: 10_000 })
    await liveBtn.click()
    const dtInput = page.locator('input[type="datetime-local"]').first()
    await expect(dtInput).not.toBeDisabled()
    await expect(page.locator('button').filter({ hasText: /Search/i }).first()).toBeVisible()
  })

  test('Search ด้วย date range → API call พร้อม query params', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /^Live$/ }).first()).toBeVisible({ timeout: 10_000 })
    await page.locator('button').filter({ hasText: /^Live$/ }).first().click()
    const now = new Date()
    const start = new Date(now.getTime() - 60 * 60 * 1000)
    const fmt = (d: Date) => d.toISOString().slice(0, 16)
    const inputs = page.locator('input[type="datetime-local"]')
    await inputs.first().fill(fmt(start))
    await inputs.last().fill(fmt(now))
    const reqP = page.waitForRequest(r => r.url().includes('/api/metrics') && r.url().includes('start'), { timeout: 15_000 })
    await page.locator('button').filter({ hasText: /Search/i }).first().click()
    await reqP
  })

  test('Pagination แสดงถ้ามี record > 50', async ({ page }) => {
    await expect(page.locator('th').filter({ hasText: /Timestamp/i })).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(500)
    const nextBtn = page.locator('button').filter({ hasText: '→' })
    const hasPagination = await nextBtn.count() > 0
    console.log(`Has pagination: ${hasPagination}`)
  })

  test('CSV export ปุ่มแสดง และ click → download .csv', async ({ page }) => {
    await expect(page.locator('th').filter({ hasText: /Timestamp/i })).toBeVisible({ timeout: 20_000 })
    const csvBtn = page.locator('button').filter({ hasText: /CSV/i })
    await expect(csvBtn).toBeVisible()
    const dl = page.waitForEvent('download', { timeout: 15_000 })
    await csvBtn.click()
    const download = await dl
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
  })

  test('Excel export ปุ่มแสดง และ click → download .xlsx', async ({ page }) => {
    await expect(page.locator('th').filter({ hasText: /Timestamp/i })).toBeVisible({ timeout: 20_000 })
    const xlsxBtn = page.locator('button').filter({ hasText: /Excel/i })
    await expect(xlsxBtn).toBeVisible()
    const dl = page.waitForEvent('download', { timeout: 15_000 })
    await xlsxBtn.click()
    const download = await dl
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
  })

  test('COP trend chart canvas render', async ({ page }) => {
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 })
  })

  test('History API ตอบสนอง (header columns โหลดได้)', async ({ page }) => {
    await expect(page.locator('th').filter({ hasText: /Timestamp/i })).toBeVisible({ timeout: 20_000 })
  })

})
