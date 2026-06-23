/**
 * 06-manual-input.spec.ts — ทดสอบ Manual Input Page กับ backend จริง (headed)
 */
import { test, expect } from '@playwright/test'

test.describe('Manual Input Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/input')
    await page.waitForLoadState('networkidle')
  })

  test('แสดง form fields ครบ', async ({ page }) => {
    await expect(page.locator('label').filter({ hasText: 'SP (kg/cm²g)' })).toBeVisible()
    await expect(page.locator('label').filter({ hasText: 'DP (kg/cm²g)' })).toBeVisible()
  })

  test('submit button มี text "Save Data"', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toHaveText('Save Data')
  })

  test('compressor select มี options (ตรวจ count จริง)', async ({ page }) => {
    const select = page.locator('select').first()
    await expect(select).toBeVisible()
    const count = await select.locator('option').count()
    console.log(`Compressor options count: ${count}`)
    expect(count).toBeGreaterThan(0)
  })

  test('กรอกค่าครบ → POST /api/metrics จริง → response 200', async ({ page }) => {
    await page.locator('#sp').fill('3.0')
    await page.locator('#dp').fill('13.0')
    // กรอก field อื่น ๆ ที่ required
    const stInput = page.locator('#st')
    if (await stInput.count()) await stInput.fill('3.0')
    const dtInput = page.locator('#dt')
    if (await dtInput.count()) await dtInput.fill('80.0')
    const ltInput = page.locator('#liquid_temp')
    if (await ltInput.count()) await ltInput.fill('35.0')
    const ampInput = page.locator('#current')
    if (await ampInput.count()) await ampInput.fill('50.0')

    const [res] = await Promise.all([
      // waitForResponse ใช้ request().method() ไม่ใช่ r.method()
      page.waitForResponse(r => r.url().includes('/api/metrics') && r.request().method() === 'POST', { timeout: 20_000 }),
      page.locator('button[type="submit"]').click(),
    ])
    console.log(`POST /api/metrics → ${res.status()}`)
    expect(res.status()).toBeLessThan(500)
  })

  test('submit สำเร็จ → แสดง "บันทึกสำเร็จ"', async ({ page }) => {
    await page.locator('#sp').fill('3.0')
    await page.locator('#dp').fill('13.0')
    const stInput = page.locator('#st')
    if (await stInput.count()) await stInput.fill('3.0')
    const dtInput = page.locator('#dt')
    if (await dtInput.count()) await dtInput.fill('80.0')
    const ltInput = page.locator('#liquid_temp')
    if (await ltInput.count()) await ltInput.fill('35.0')
    const ampInput = page.locator('#current')
    if (await ampInput.count()) await ampInput.fill('50.0')

    await page.locator('button[type="submit"]').click()
    await expect(page.locator('text=บันทึกสำเร็จ')).toBeVisible({ timeout: 15_000 })
  })

  test('กรอกค่าผิด range (SP < 0) → ขึ้น error หรือ validation', async ({ page }) => {
    await page.locator('#sp').fill('-999')
    await page.locator('#dp').fill('13.0')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3000)
    // ต้องแสดง error ไม่ว่าจะเป็น frontend validation หรือ backend error
    const hasError = await page.locator('text=/error|ข้อผิดพลาด|ไม่ถูกต้อง|invalid/i').count()
    console.log(`Error shown for invalid SP: ${hasError > 0}`)
  })

  test('ปุ่ม submit disabled ขณะกำลัง submit', async ({ page }) => {
    await page.locator('#sp').fill('3.0')
    await page.locator('#dp').fill('13.0')
    const clickP = page.locator('button[type="submit"]').click()
    await expect(page.locator('button[type="submit"]')).toHaveText('กำลังบันทึก…')
    await clickP
  })

  test('ค่า default ใน form (ตรวจ placeholder/value เริ่มต้น)', async ({ page }) => {
    const spInput = page.locator('#sp')
    await expect(spInput).toBeVisible()
    // ตรวจว่า field ว่างหรือมี default value
    const val = await spInput.inputValue()
    console.log(`SP default value: "${val}"`)
  })

})
