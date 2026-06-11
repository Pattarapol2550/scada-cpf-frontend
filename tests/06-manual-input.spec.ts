import { test, expect } from '@playwright/test'
import { mockProbe } from './helpers'

const MOCK_SUCCESS = {
  status: 'Success',
  analysis: { cop: 3.5, power_kw: 28.6, q_e_kw: 100.1, alarms: [] },
}

test.describe('Manual Input Page', () => {

  test.beforeEach(async ({ page }) => {
    await mockProbe(page)
    await page.goto('/input')
  })

  // ── Layout ────────────────────────────────────────────────

  test('แสดง form fields ครบ', async ({ page }) => {
    await expect(page.locator('select, input').first()).toBeVisible()
    // label จริงใน Field component
    await expect(page.locator('label').filter({ hasText: 'SP (kg/cm²g)' })).toBeVisible()
    await expect(page.locator('label').filter({ hasText: 'DP (kg/cm²g)' })).toBeVisible()
  })

  test('submit button มี text "Save Data"', async ({ page }) => {
    // text จริงคือ "Save Data" เมื่อ status !== 'loading'
    await expect(page.locator('button[type="submit"]')).toHaveText('Save Data')
  })

  test('แสดง compressor select มี 7 options', async ({ page }) => {
    const select = page.locator('select').first()
    await expect(select).toBeVisible()
    await expect(select.locator('option')).toHaveCount(7)
  })

  // ── Submit → POST /api/metrics ────────────────────────────

  test('กรอก SP + DP แล้ว submit → call POST /api/metrics', async ({ page }) => {
    await page.route('**/api/metrics', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUCCESS) })
      } else { await route.continue() }
    })

    // input id="sp" และ id="dp" ตาม Field component จริง
    await page.locator('#sp').fill('3.0')
    await page.locator('#dp').fill('13.0')

    const reqP = page.waitForRequest(r =>
      r.url().includes('/api/metrics') && r.method() === 'POST'
    )
    // ปุ่ม text จริงคือ "Save Data"
    await page.locator('button[type="submit"]').click()
    await reqP
  })

  // ── Success state ─────────────────────────────────────────

  test('submit สำเร็จ → แสดง "✅ บันทึกสำเร็จ กำลัง redirect…"', async ({ page }) => {
    await page.route('**/api/metrics', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUCCESS) })
      } else { await route.continue() }
    })

    await page.locator('#sp').fill('3.0')
    await page.locator('#dp').fill('13.0')
    await page.locator('button[type="submit"]').click()

    // text จริงคือ "✅ บันทึกสำเร็จ กำลัง redirect…" (status === 'success')
    await expect(page.locator('text=บันทึกสำเร็จ กำลัง redirect…')).toBeVisible({ timeout: 8_000 })
  })

  // ── Loading state ─────────────────────────────────────────

  test('กด submit → button เปลี่ยนเป็น "กำลังบันทึก…"', async ({ page }) => {
    await page.route('**/api/metrics', async route => {
      if (route.request().method() === 'POST') {
        // ใช้ native Promise แทน page.waitForTimeout (ห้ามใช้ใน route callback)
        await new Promise(resolve => setTimeout(resolve, 400))
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUCCESS) })
      } else { await route.continue() }
    })

    await page.locator('#sp').fill('3.0')
    await page.locator('#dp').fill('13.0')

    // click แล้ว assert loading state ทันที ก่อน response กลับมา
    const clickPromise = page.locator('button[type="submit"]').click()
    await expect(page.locator('button[type="submit"]')).toHaveText('กำลังบันทึก…')
    await clickPromise

    // cleanup route ที่ค้างอยู่
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })

  // ── Error state ───────────────────────────────────────────

  test('API error → แสดง "บันทึกไม่สำเร็จ กรุณาลองใหม่"', async ({ page }) => {
    await page.route('**/api/metrics', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Server Error' }) })
      } else { await route.continue() }
    })

    await page.locator('#sp').fill('3.0')
    await page.locator('#dp').fill('13.0')
    await page.locator('button[type="submit"]').click()

    // text จริงคือ "บันทึกไม่สำเร็จ กรุณาลองใหม่" (status === 'error')
    await expect(page.locator('text=บันทึกไม่สำเร็จ กรุณาลองใหม่')).toBeVisible({ timeout: 8_000 })
  })

})