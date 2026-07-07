/**
 * utils/staleConfig.js — shared "sensor timeout" threshold
 * ใช้ร่วมกันทั้ง DashboardPage (per-compressor detail) และ FleetOverview (Overview tab)
 * ปรับตัวเลขนี้ที่เดียวถ้าต้องการเปลี่ยนเวลาในอนาคต
 */
export const STALE_THRESHOLD_SEC = 60

export function formatStaleDuration(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) {
    return `${h} ชม ${m}:${String(s).padStart(2, '0')} นาที`
  }
  return `${m}:${String(s).padStart(2, '0')} นาที`
}
