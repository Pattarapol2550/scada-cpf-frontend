/**
 * auth.setup.ts — Login จริงด้วย admin3 / Admin12345
 * บันทึก storage state เพื่อให้ test อื่นไม่ต้อง login ซ้ำ
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

setup('login with admin3 and save session', async ({ page }) => {
  await page.goto('/login')

  // ฟอร์ม username/password ซ่อนอยู่ ต้องกดปุ่ม expand ก่อน
  await page.locator('button', { hasText: 'เข้าสู่ระบบด้วยรหัสผ่าน' }).click()

  await page.locator('input[type="text"]').fill('admin3')
  await page.locator('input[type="password"]').fill('Admin12345')
  await page.locator('button[type="submit"]').click()

  await page.waitForURL('**/dashboard', { timeout: 15_000 })
  await expect(page).toHaveURL(/\/dashboard/)

  await page.context().storageState({ path: AUTH_FILE })
})
