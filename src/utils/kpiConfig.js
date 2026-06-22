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
  { key: 'q_l_kgkg',       label: 'q_L',           unit: 'kJ/kg',   source: 'enthalpy',        group: 'enthalpy' },
  { key: 'w_comp_kgkg',    label: 'w_comp',        unit: 'kJ/kg',   source: 'enthalpy',        group: 'enthalpy' },
  { key: 'sp_kg',          label: 'SP',            unit: 'kg/cm²',  source: 'inputs_snapshot', group: 'sensor' },
  { key: 'dp_kg',          label: 'DP',            unit: 'kg/cm²',  source: 'inputs_snapshot', group: 'sensor' },
  { key: 'st_c',           label: 'ST',            unit: '°C',      source: 'inputs_snapshot', group: 'sensor' },
  { key: 'dt_c',           label: 'DT',            unit: '°C',      source: 'inputs_snapshot', group: 'sensor' },
  { key: 'liquid_temp_c',  label: 'Liquid Temp',   unit: '°C',      source: 'inputs_snapshot', group: 'sensor' },
  { key: 'current_amp',    label: 'Current',       unit: 'A',       source: 'inputs_snapshot', group: 'sensor' },
  { key: 'evaporator_room_temp_c', label: 'Room Temp',  unit: '°C', source: 'inputs_snapshot', group: 'sensor' },
  { key: 'condenser_temp_c',       label: 'Cond. Temp', unit: '°C', source: 'inputs_snapshot', group: 'sensor' },
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

export function getKpiValue(record, kpiKey) {
  if (!record) return null
  const def  = KPI_MAP[kpiKey]
  if (!def) return null
  const diag = record.diagnosis || {}
  if (def.source === 'diagnosis')       return diag[kpiKey]                    ?? null
  if (def.source === 'enthalpy')        return diag.enthalpy?.[kpiKey]         ?? null
  if (def.source === 'inputs_snapshot') return record.inputs_snapshot?.[kpiKey] ?? null
  return null
}
