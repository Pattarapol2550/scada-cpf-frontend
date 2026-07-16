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

/** วันที่ (Asia/Bangkok) จาก timestamp record — ใช้ group แถว summary รายวัน */
function recordDateKey(r) {
  return new Date(r.timestamp).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function minMax(records, getter) {
  const vals = records.map(getter).filter(v => v !== null && v !== undefined && !isNaN(v))
  if (!vals.length) return { min: '--', max: '--' }
  return { min: Math.min(...vals), max: Math.max(...vals) }
}

/** สร้างข้อความสรุปรายวัน 1 บรรทัดต่อวัน (อ่านง่าย ไม่ต้องอิงหัวตาราง) */
function buildDailySummaryLines(records) {
  const byDate = new Map()
  for (const r of records) {
    const key = recordDateKey(r)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key).push(r)
  }
  return [...byDate.entries()].map(([date, recs]) => {
    const sp  = minMax(recs, r => r.sp_kg)
    const dp  = minMax(recs, r => r.dp_kg)
    const st  = minMax(recs, r => r.st_c)
    const dt  = minMax(recs, r => r.dt_c)
    const cop = minMax(recs, r => r.diagnosis?.cop)
    const comp = recs[0]?.compressor_id ?? ''
    return `สรุปวันที่ ${date} (${comp})  |  SP: ${sp.min}~${sp.max} kg/cm²  |  DP: ${dp.min}~${dp.max} kg/cm²  |  ST: ${st.min}~${st.max} °C  |  DT: ${dt.min}~${dt.max} °C  |  COP: ${cop.min}~${cop.max}`
  })
}

export function exportCSV(records, filename, { dailySummary = false } = {}) {
  if (!records.length) return
  const data   = records.map(flattenRecord)
  const header = Object.keys(data[0]).join(',')
  const body   = data.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n')
  let content  = header + '\n' + body
  if (dailySummary) {
    const lines = buildDailySummaryLines(records)
    content += '\n\n' + lines.map(l => `"${l}"`).join('\n')
  }
  const blob   = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function exportXLSX(records, filename, sheetName = 'Sheet1', { dailySummary = false } = {}) {
  if (!records.length) return
  const data = records.map(flattenRecord)
  const ws = XLSX.utils.json_to_sheet(data)
  if (dailySummary) {
    const lines = buildDailySummaryLines(records)
    const startRow = data.length + 2 // เว้น 1 บรรทัดจากข้อมูลท้ายสุด
    XLSX.utils.sheet_add_aoa(ws, lines.map(l => [l]), { origin: `A${startRow + 1}` })
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}
