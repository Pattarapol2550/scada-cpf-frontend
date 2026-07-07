/**
 * utils/dashboardLayout.js — ลำดับการจัดวาง widget บน Dashboard (drag-to-reorder)
 * เก็บใน localStorage เป็น array ของ widget id เช่น ['kpi:cop', 'chart:ph', ...]
 * widget ที่ยังไม่เคยถูกจัดลำดับ (เช่น เพิ่ง add KPI ใหม่) จะถูกต่อท้ายอัตโนมัติ
 */
const LS_KEY = 'scada-dashboard-layout'

export function loadLayout() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] }
}

export function saveLayout(order) {
  localStorage.setItem(LS_KEY, JSON.stringify(order))
  window.dispatchEvent(new Event('dashboard-layout-updated'))
}

export function resetLayout() {
  localStorage.removeItem(LS_KEY)
  window.dispatchEvent(new Event('dashboard-layout-updated'))
}

/**
 * เรียง widgets ตาม savedOrder — ตัวที่ไม่มีใน savedOrder คงลำดับเดิมไว้ท้ายสุด
 * (Array.prototype.sort เสถียรใน engine สมัยใหม่ → ไม่สลับ widget ที่ index เท่ากัน)
 */
export function orderWidgets(widgets, savedOrder) {
  const rank = (id) => {
    const i = savedOrder.indexOf(id)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  return [...widgets].sort((a, b) => rank(a.id) - rank(b.id))
}
