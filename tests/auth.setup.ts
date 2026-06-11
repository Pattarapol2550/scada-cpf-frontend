/**
 * auth.setup.ts
 * Login ครั้งเดียว บันทึก storage state → tests ทุกตัวไม่ต้อง login ซ้ำ
 */
import { test as setup, expect } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

// ES module ไม่มี __dirname → ใช้ import.meta.url แทน
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

setup('login and save session', async ({ page }) => {
  await page.goto('/login')

  await page.locator('input[type="email"]').fill('admin@example.com')
  await page.locator('input[type="password"]').fill('password')
  await page.locator('button[type="submit"]').click()

  await page.waitForURL('**/dashboard', { timeout: 10_000 })
  await expect(page).toHaveURL(/\/dashboard/)

  await page.context().storageState({ path: AUTH_FILE })
})