/**
 * helpers.ts — shared utilities สำหรับ test ทุกตัว
 */
import { Page, expect } from '@playwright/test'

/** mock API ด้วย real-looking response */
export const MOCK_METRICS = [
  {
    _id: 'doc001',
    compressor_id: 'COMP-01',
    timestamp: new Date().toISOString(),
    inputs_snapshot: { sp_kg: 3.0, dp_kg: 13.0, st_c: 3.0, dt_c: 80.0, liquid_temp_c: 35.0, current_amp: 50.0 },
    diagnosis: {
      cop: 3.5, power_kw: 28.6, q_e_kw: 100.1,
      superheat_suc: 5.2, subcooling: 2.1, pressure_ratio: 4.3, m_dot_kgh: 1200.0,
      alarms: [],
      modes: { sh_mode: 'measured', dt_mode: 'measured' },
    },
  },
]

export const MOCK_PH = {
  compressor_id: 'COMP-01',
  timestamp: new Date().toISOString(),
  record_id: 'doc001',
  saturation_dome: {
    liquid: Array.from({ length: 20 }, (_, i) => ({ h: 200 + i * 10, p: 0.1 + i * 0.3 })),
    vapour: Array.from({ length: 20 }, (_, i) => ({ h: 1400 + i * 10, p: 0.1 + i * 0.3 })),
    critical: { h: 788.6, p: 11.33 },
  },
  cycle: {
    point1:  { h: 1473, p: 0.396, label: '1 — Comp. inlet',  t_c: 3.0  },
    point2:  { h: 1619, p: 1.376, label: '2 — Comp. outlet', t_c: 80.0 },
    point2s: { h: 1598, p: 1.376, label: '2s — Isentropic'              },
    point3:  { h: 366,  p: 1.376, label: '3 — Cond. outlet', t_c: 35.0 },
    point4:  { h: 366,  p: 0.396, label: '4 — Evap. inlet'              },
    isentropic_efficiency: 0.88,
  },
  inputs_snapshot: { sp_kg: 3.0, dp_kg: 13.0, st_c: 3.0, dt_c: 80.0, liquid_temp_c: 35.0, current_amp: 50.0 },
}

/** intercept /api/metrics/:id → return mock data */
export async function mockMetrics(page: Page, compId = 'COMP-01', data = MOCK_METRICS) {
  await page.route(`**/api/metrics/${compId}**`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data.map(d => ({ ...d, compressor_id: compId }))),
    })
  })
}

/** intercept /api/ph-diagram/:id → return mock PH data */
export async function mockPH(page: Page, compId = 'COMP-01', status = 200) {
  await page.route(`**/api/ph-diagram/${compId}**`, async route => {
    if (status === 404) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: `ไม่พบข้อมูลของ ${compId} ในช่วงเวลาที่เลือก` }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_PH, compressor_id: compId }),
      })
    }
  })
}

/** intercept connection probe */
export async function mockProbe(page: Page) {
  await page.route('**/api/metrics/COMP-01**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
}

/** navigate ไปหน้าที่ต้องการ พร้อม intercept probe */
export async function gotoPage(page: Page, path: string) {
  await mockProbe(page)
  await page.goto(path)
}
