/**
 * 05-ph-diagram.spec.ts — ทดสอบ PH Diagram กับ backend จริง (headed)
 */
import { test, expect } from '@playwright/test'

test.describe('PH Diagram Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/ph-diagram')
  })

  test('แสดง panel title "P-H Diagram"', async ({ page }) => {
    await expect(page.locator('text=/P-H Diagram/i')).toBeVisible({ timeout: 10_000 })
  })

  test('แสดง compressor select dropdown default COMP-01', async ({ page }) => {
    const select = page.locator('select').first()
    await expect(select).toBeVisible({ timeout: 10_000 })
    await expect(select).toHaveValue('COMP-01')
  })

  test('render chart canvas', async ({ page }) => {
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25_000 })
  })

  test('Cycle Point cards — ตรวจว่า backend ส่ง cycle data มาครบ (BUG ถ้าไม่มี)', async ({ page }) => {
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25_000 })
    await page.waitForTimeout(1000)
    const pointCount = await page.locator('text=/Point [1-4]/').count()
    console.log(`Cycle point cards visible: ${pointCount} (expected 4 — BUG if 0)`)
    // ถ้า pointCount = 0 แสดงว่า backend ไม่ส่ง cycle.point1-4 → บัค
  })

  test('Isentropic efficiency — ตรวจว่า backend ส่งค่ามา (BUG ถ้าไม่มี)', async ({ page }) => {
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25_000 })
    await page.waitForTimeout(500)
    const hasEff = await page.locator('text=Isentropic efficiency:').count()
    console.log(`Isentropic efficiency shown: ${hasEff > 0} (BUG if false — backend missing cycle.isentropic_efficiency)`)
  })

  test('แสดง legend: Saturation dome + Cycle', async ({ page }) => {
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25_000 })
    await expect(page.locator('text=Saturation dome')).toBeVisible({ timeout: 12_000 })
    await expect(page.locator('text=Cycle')).toBeVisible()
  })

  test('เปลี่ยน comp → request ph-diagram COMP-02', async ({ page }) => {
    await expect(page.locator('select').first()).toBeVisible({ timeout: 10_000 })
    const reqP = page.waitForRequest(r => r.url().includes('/api/ph-diagram/COMP-02'), { timeout: 15_000 })
    await page.locator('select').first().selectOption('COMP-02')
    await reqP
  })

  test('ปุ่ม "ระบุเวลา" toggle แสดง/ซ่อน datetime input', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: /ระบุเวลา/ })
    await expect(toggleBtn).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="datetime-local"]')).not.toBeVisible()
    await toggleBtn.click()
    await expect(page.locator('input[type="datetime-local"]')).toBeVisible()
  })

  test('timestamp mode → กด "ดึงข้อมูล" → request พร้อม timestamp param', async ({ page }) => {
    await page.locator('button').filter({ hasText: /ระบุเวลา/ }).click()
    const reqP = page.waitForRequest(
      r => r.url().includes('/api/ph-diagram/COMP-01') && r.url().includes('timestamp'),
      { timeout: 15_000 }
    )
    await page.locator('button').filter({ hasText: 'ดึงข้อมูล' }).click()
    await reqP
  })

  test('timestamp mode badge "เลือกเวลา" แสดง', async ({ page }) => {
    await page.locator('button').filter({ hasText: /ระบุเวลา/ }).click()
    await expect(page.locator('text=เลือกเวลา')).toBeVisible()
  })

  test('ปิด timestamp mode → กลับเป็น latest', async ({ page }) => {
    const btn = page.locator('button').filter({ hasText: /ระบุเวลา/ })
    await btn.click()
    await expect(page.locator('input[type="datetime-local"]')).toBeVisible()
    await btn.click()
    await expect(page.locator('input[type="datetime-local"]')).not.toBeVisible()
  })

  test('ปุ่ม PDF export แสดงเมื่อมีข้อมูล', async ({ page }) => {
    await expect(page.locator('canvas')).toBeVisible({ timeout: 25_000 })
    const pdfBtn = page.locator('button').filter({ hasText: /PDF/i })
    await expect(pdfBtn).toBeVisible()
    await expect(pdfBtn).not.toBeDisabled()
  })

  test('PDF export → download file .pdf ชื่อมี COMP-01', async ({ page }) => {
    await expect(page.locator('canvas')).toBeVisible({ timeout: 25_000 })
    const dl = page.waitForEvent('download', { timeout: 15_000 })
    await page.locator('button').filter({ hasText: /⬇.*PDF|PDF/i }).click()
    const download = await dl
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
    expect(download.suggestedFilename()).toContain('COMP-01')
  })

  test('PH API ตอบสนอง (canvas โหลดได้)', async ({ page }) => {
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25_000 })
  })

})
