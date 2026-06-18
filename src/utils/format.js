/**
 * utils/format.js — Shared formatting helpers (eliminate duplicate code across pages)
 */

export const COMPRESSORS = [
  'COMP-01', 'COMP-02', 'COMP-03', 'COMP-04',
  'COMP-05', 'COMP-06', 'COMP-07',
]

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

/** Parse numeric value — returns null for "--" sentinel or NaN */
export function num(v) {
  return isNaN(Number(v)) ? null : Number(v)
}

/** Hours ago → { start, end } as localDT strings */
export function lastNHours(hours) {
  const now  = new Date()
  const past = new Date(now - hours * 3_600_000)
  return { start: toLocalDT(past), end: toLocalDT(now) }
}
