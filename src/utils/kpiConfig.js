/**
 * utils/kpiConfig.js
 */

export const ALL_KPI = [
  { key: 'power_kw',       label: 'P_comp',       unit: 'kW',      source: 'diagnosis',       group: 'performance' },
  { key: 'cop',            label: 'COP',           unit: '—',       source: 'diagnosis',       group: 'performance' },
  { key: 'q_e_kw',         label: 'Q_e',           unit: 'kW',      source: 'diagnosis',       group: 'performance' },
  { key: 'm_dot_kgh',      label: 'Mass Flow',     unit: 'kg/h',    source: 'diagnosis',       group: 'performance' },
  { key: 'superheat_suc',  label: 'Superheat',     unit: 'K',       source: 'diagnosis',       group: 'performance' },
  { key: 'subcooling',     label: 'Subcooling',    unit: 'K',       source: 'diagnosis',       group: 'performance' },
  { key: 'pressure_ratio', label: 'Press. Ratio',  unit: '—',       source: 'diagnosis',       group: 'performance' },
  { key: 't_evap_c',       label: 'T_evap',        unit: '°C',      source: 'enthalpy',        group: 'enthalpy' },
  { key: 't_cond_c',       label: 'T_cond',        unit: '°C',      source: 'enthalpy',        group: 'enthalpy' },
  { key: 'eta_is_pct',     label: 'η isentropic',  unit: '%',       source: 'enthalpy',        group: 'enthalpy' },
  { key: 'h1',             label: 'h1',            unit: 'kJ/kg',   source: 'enthalpy',        group: 'enthalpy' },
  { key: 'h2',             label: 'h2',            unit: 'kJ/kg',   source: 'enthalpy',        group: 'enthalpy' },
  { key: 'h3',             label: 'h3',            unit: 'kJ/kg',   source: 'enthalpy',        group: 'enthalpy' },
  { key: 'q_l_kjkg',       label: 'q_L',           unit: 'kJ/kg',   source: 'enthalpy',        group: 'enthalpy' },
  { key: 'w_comp_kjkg',    label: 'w_comp',        unit: 'kJ/kg',   source: 'enthalpy',        group: 'enthalpy' },
  { key: 'sp_kg',          label: 'SP',            unit: 'kg/cm²',  source: 'inputs_snapshot', group: 'sensor' },
  { key: 'dp_kg',          label: 'DP',            unit: 'kg/cm²',  source: 'inputs_snapshot', group: 'sensor' },
  { key: 'st_c',           label: 'ST',            unit: '°C',      source: 'inputs_snapshot', group: 'sensor' },
  { key: 'dt_c',           label: 'DT',            unit: '°C',      source: 'inputs_snapshot', group: 'sensor' },
  { key: 'liquid_temp_c',  label: 'Liquid Temp',   unit: '°C',      source: 'inputs_snapshot', group: 'sensor' },
  { key: 'current_amp',    label: 'Current',       unit: 'A',       source: 'inputs_snapshot', group: 'sensor' },
  { key: 'evaporator_room_temp_c', label: 'Room Temp',  unit: '°C', source: 'inputs_snapshot', group: 'sensor' },
  { key: 'condenser_temp_c',       label: 'Cond. Temp', unit: '°C', source: 'inputs_snapshot', group: 'sensor' },
  // Extra sensor fields (จาก CSV import / sensor เพิ่มเติม)
  { key: 'slide_valve_pct', label: 'Slide Valve',  unit: '%',       source: 'inputs_snapshot', group: 'extra' },
  { key: 'oil_pressure',    label: 'Oil Pressure', unit: 'kg/cm²',  source: 'inputs_snapshot', group: 'extra' },
  { key: 'oil_temp',        label: 'Oil Temp',     unit: '°C',      source: 'inputs_snapshot', group: 'extra' },
  { key: 'oil_level',       label: 'Oil Level',    unit: '—',       source: 'inputs_snapshot', group: 'extra' },
  { key: 'oil_filter',      label: 'Oil Filter ΔP',unit: '—',       source: 'inputs_snapshot', group: 'extra' },
  { key: 'glycol_temp',     label: 'Glycol Temp',  unit: '°C',      source: 'inputs_snapshot', group: 'extra' },
  { key: 'glycol_level',    label: 'Glycol Level', unit: '—',       source: 'inputs_snapshot', group: 'extra' },
  { key: 'nh3_level',       label: 'NH₃ Level',    unit: '—',       source: 'inputs_snapshot', group: 'extra' },
  { key: 'nh3_pump',        label: 'NH₃ Pump',     unit: '—',       source: 'inputs_snapshot', group: 'extra' },
  { key: 'run_hour',        label: 'Run Hour',     unit: 'hr',      source: 'inputs_snapshot', group: 'extra' },
  { key: 'room_temp_1b',    label: 'Room 1B',      unit: '°C',      source: 'inputs_snapshot', group: 'extra' },
  { key: 'room_temp_1c',    label: 'Room 1C',      unit: '°C',      source: 'inputs_snapshot', group: 'extra' },
  { key: 'room_temp_2b',    label: 'Room 2B',      unit: '°C',      source: 'inputs_snapshot', group: 'extra' },
  { key: 'room_temp_2c',    label: 'Room 2C',      unit: '°C',      source: 'inputs_snapshot', group: 'extra' },
  { key: 'room_temp_3b',    label: 'Room 3B',      unit: '°C',      source: 'inputs_snapshot', group: 'extra' },
]

export const KPI_MAP = Object.fromEntries(ALL_KPI.map(k => [k.key, k]))

export const DEFAULT_KPI_KEYS = [
  'power_kw', 'cop', 'q_e_kw', 'superheat_suc', 'subcooling', 'pressure_ratio',
]

const LS_KEY = 'scada-kpi-config'

export function loadKpiConfig() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULT_KPI_KEYS
    return JSON.parse(raw).filter(k => KPI_MAP[k])
  } catch {
    return DEFAULT_KPI_KEYS
  }
}

export function saveKpiConfig(keys) {
  localStorage.setItem(LS_KEY, JSON.stringify(keys))
  // แจ้ง DashboardPage (same tab) ให้ re-read ทันที
  window.dispatchEvent(new Event('kpi-config-updated'))
}

// ── Admin KPI catalog customization (label/unit/visibility) ───────────────────
// เก็บใน localStorage เครื่อง admin เท่านั้น — ไม่กระทบ user คนอื่น/เครื่องอื่น
// "เพิ่ม/ลบ" คือ แสดง/ซ่อนจาก ALL_KPI (ค่าต้องอ้างอิง field ที่มีอยู่จริงเสมอ)
// "แก้ไข" คือ เปลี่ยน label/unit ที่แสดงผล — ไม่กระทบ source ที่ใช้ดึงค่าจริง

const OVERRIDES_LS_KEY = 'scada-kpi-catalog-overrides'  // { [key]: { label?, unit? } }
const HIDDEN_LS_KEY    = 'scada-kpi-catalog-hidden'     // string[] keys ที่ถูกซ่อน

export function loadKpiOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_LS_KEY)) || {} } catch { return {} }
}

export function saveKpiOverrides(overrides) {
  localStorage.setItem(OVERRIDES_LS_KEY, JSON.stringify(overrides))
  window.dispatchEvent(new Event('kpi-catalog-updated'))
}

export function loadHiddenKpiKeys() {
  try { return JSON.parse(localStorage.getItem(HIDDEN_LS_KEY)) || [] } catch { return [] }
}

export function saveHiddenKpiKeys(keys) {
  localStorage.setItem(HIDDEN_LS_KEY, JSON.stringify(keys))
  window.dispatchEvent(new Event('kpi-catalog-updated'))
}

/** ALL_KPI หลัง apply label/unit override และกรอง key ที่ถูกซ่อนออก */
export function getKpiCatalog() {
  const overrides = loadKpiOverrides()
  const hidden = new Set(loadHiddenKpiKeys())
  return ALL_KPI
    .filter(k => !hidden.has(k.key))
    .map(k => (overrides[k.key] ? { ...k, ...overrides[k.key] } : k))
}

/** ตัว def เดียว (พร้อม override) — คืน null ถ้าไม่พบหรือถูกซ่อน */
export function getKpiDef(key) {
  return getKpiCatalog().find(k => k.key === key) ?? null
}

export function getKpiValue(record, kpiKey) {
  if (!record) return null
  const def  = KPI_MAP[kpiKey]
  if (!def) return null
  const diag = record.diagnosis || {}
  if (def.source === 'diagnosis')       return diag[kpiKey]                    ?? null
  if (def.source === 'enthalpy')        return diag.enthalpy?.[kpiKey]         ?? null
  if (def.source === 'inputs_snapshot') return record[kpiKey] ?? null
  return null
}
