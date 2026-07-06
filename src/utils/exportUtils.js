import * as XLSX from 'xlsx'
import { formatThaiTime } from './format'

export function flattenRecord(r) {
  return {
    Timestamp:          formatThaiTime(r.timestamp),
    Compressor:         r.compressor_id,
    'SP (kg/cm²)':      r.sp_kg         ?? '--',
    'DP (kg/cm²)':      r.dp_kg         ?? '--',
    'ST (°C)':          r.st_c          ?? '--',
    'DT (°C)':          r.dt_c          ?? '--',
    'Liquid Temp (°C)': r.liquid_temp_c ?? '--',
    'Current (A)':      r.current_amp   ?? '--',
    COP:                r.diagnosis?.cop            ?? '--',
    'P_comp (kW)':      r.diagnosis?.power_kw       ?? '--',
    'Q_e (kW)':         r.diagnosis?.q_e_kw         ?? '--',
    'Superheat (K)':    r.diagnosis?.superheat_suc  ?? '--',
    'Subcooling (K)':   r.diagnosis?.subcooling     ?? '--',
    'Press. Ratio':     r.diagnosis?.pressure_ratio ?? '--',
    'Mass Flow (kg/h)': r.diagnosis?.m_dot_kgh      ?? '--',
    Alarms:             (r.diagnosis?.alarms || []).map(a => a.title).join('; '),
  }
}

export function exportCSV(records, filename) {
  if (!records.length) return
  const data   = records.map(flattenRecord)
  const header = Object.keys(data[0]).join(',')
  const body   = data.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n')
  const blob   = new Blob(['﻿' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function exportXLSX(records, filename, sheetName = 'Sheet1') {
  if (!records.length) return
  const ws = XLSX.utils.json_to_sheet(records.map(flattenRecord))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}
