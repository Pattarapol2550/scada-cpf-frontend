/**
 * utils/format.js — Shared formatting helpers (eliminate duplicate code across pages)
 */

export const COMPRESSORS = [
  'COMP-01', 'COMP-02', 'COMP-03', 'COMP-04',
  'COMP-05', 'COMP-06', 'COMP-07',
]

// Design setpoint ของโรงงาน (kg/cm²g) — ใช้ pre-fill SP/DP ใน ManualInputPage
export const SYSTEM_PRESSURE = {
  lp_sp:  -0.30,  // LP vessel ~-40°C (vacuum)
  inter:   2.25,  // Intercooler ~-7°C (intermediate)
  hp:     12.30,  // HP/Condenser ~34.5°C
}

// SP/DP default ตาม compressor type
export function getDefaultPressures(compType) {
  if (compType === 'booster')    return { sp: SYSTEM_PRESSURE.lp_sp, dp: SYSTEM_PRESSURE.inter }
  if (compType === 'high_stage') return { sp: SYSTEM_PRESSURE.inter,  dp: SYSTEM_PRESSURE.hp }
  return { sp: '', dp: '' }
}

// จากแผนผังระบบ: 2,3,4 = Booster | 1,6,7 = High Stage | 5 = S/W (switchable)
export const COMPRESSOR_TYPE = {
  'COMP-01': 'high_stage',
  'COMP-02': 'booster',
  'COMP-03': 'booster',
  'COMP-04': 'booster',
  'COMP-05': 'booster',   // S/W — default booster, สามารถแก้ได้
  'COMP-06': 'high_stage',
  'COMP-07': 'high_stage',
}

export const COMPRESSOR_TYPE_LABEL = {
  booster:    'Booster',
  high_stage: 'High Stage',
  single:     'Single Stage',
}

/** Date → "2024-06-01T14:30" (local datetime-local input value) */
export function toLocalDT(date) {
  const p = n => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `T${p(date.getHours())}:${p(date.getMinutes())}`
  )
}

/** ISO string → Thai locale display string */
export function formatThaiTime(str, withYear = false) {
  if (!str) return '--'
  return new Date(str).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour12: false,
    day: '2-digit',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Parse numeric value — returns null for null/undefined/"--" sentinel or NaN */
export function num(v) {
  if (v === null || v === undefined) return null
  return isNaN(Number(v)) ? null : Number(v)
}

/** Hours ago → { start, end } as localDT strings */
export function lastNHours(hours) {
  const now  = new Date()
  const past = new Date(now - hours * 3_600_000)
  return { start: toLocalDT(past), end: toLocalDT(now) }
}

/** ISO string → full Thai datetime including seconds */
export function formatFull(str) {
  if (!str) return '--'
  return new Date(str).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', hour12: false,
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}
