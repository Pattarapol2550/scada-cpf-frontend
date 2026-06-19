import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from '../components/layout/Navbar'
import KPICard from '../components/dashboard/KPICard'
import AlarmLog from '../components/dashboard/AlarmLog'
import DiagnosisReport from '../components/dashboard/DiagnosisReport'
import { useMetrics } from '../hooks/useMetrics'
import { useAuth } from '../context/AuthContext'
import { getPHDiagram } from '../services/api'
import { COMPRESSORS, toLocalDT, formatThaiTime, num } from '../utils/format'
import { CHART_DEFAULTS, mkDs } from '../utils/chartConfig'
import { KPI_MAP, loadKpiConfig, getKpiValue } from '../utils/kpiConfig'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Scatter } from 'react-chartjs-2'
import * as XLSX from 'xlsx'
import Annotation from 'chartjs-plugin-annotation'

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, Tooltip, Legend, Filler,
  Annotation
)

// ── Sparkline mini SVG ────────────────────────────────────
function Sparkline({ data, color }) {
  const pts = (data || []).filter(v => v !== null)
  if (pts.length < 2) return null
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min || 1
  const W = 100, H = 24, pad = 2
  const x = (i) => pad + (i / (data.length - 1)) * (W - pad * 2)
  const y = (v)  => pad + (1 - (v - min) / range) * (H - pad * 2)
  const allPts = data.map((v, i) => v !== null ? `${x(i)},${y(v)}` : null).filter(Boolean)
  const last   = data.reduce((acc, v, i) => v !== null ? { v, i } : acc, null)
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ display: 'block', marginTop: 6 }}>
      <polyline points={allPts.join(' ')} fill="none"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {last && <circle cx={x(last.i)} cy={y(last.v)} r="2.5" fill={color} />}
    </svg>
  )
}

// ── Alarm Popup ───────────────────────────────────────────
function AlarmPopup({ popup, onClose, onDetail, formatFull }) {
  if (!popup) return null
  const hasCrit = popup.alarms.some(a => a.severity === 'Critical')
  const color   = hasCrit ? 'var(--red)'       : 'var(--amber)'
  const bgColor = hasCrit ? 'var(--red-dim)'   : 'var(--amber-dim)'
  const border  = hasCrit ? 'rgba(248,81,73,0.4)' : 'rgba(210,153,34,0.4)'
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 500,
      width: 310, background: 'var(--bg1)',
      border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      animation: 'slideInRight 0.25s ease-out',
    }}>
      <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', background: bgColor,
        borderBottom: `1px solid ${border}`,
      }}>
        <span style={{ fontSize: 14 }}>{hasCrit ? '🔴' : '🟡'}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, flex: 1,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {hasCrit ? 'Critical Alert' : 'Warning'}
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-3)', fontSize: 18, lineHeight: 1, padding: 0,
        }}>×</button>
      </div>
      {/* Alarm list */}
      <div style={{ padding: '10px 14px 6px' }}>
        {popup.alarms.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{a.title}</span>
          </div>
        ))}
        <div style={{
          fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace',
          marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
        }}>
          {formatFull(popup.timestamp)}
        </div>
      </div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 14px 12px' }}>
        <button onClick={onDetail} style={{
          flex: 1, padding: '7px 0', fontSize: 12, borderRadius: 7,
          background: color, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
        }}>ดูรายละเอียด</button>
        <button onClick={onClose} style={{
          flex: 1, padding: '7px 0', fontSize: 12, borderRadius: 7,
          background: 'var(--bg2)', color: 'var(--text-2)',
          border: '1px solid var(--border)', cursor: 'pointer',
        }}>ปิด</button>
      </div>
    </div>
  )
}

// ── FilterBar ─────────────────────────────────────────────
function FilterBar({ start, setStart, end, setEnd, onSearch }) {
  const [activeShortcut, setActiveShortcut] = useState(null)

  const setRangeH = (hours) => {
    const now = new Date(), past = new Date(now - hours * 3600000)
    const s = toLocalDT(past), e = toLocalDT(now)
    setStart(s); setEnd(e); setActiveShortcut(hours); onSearch(s, e)
  }

  const handleReset = () => {
    const now = new Date(), past = new Date(now - 2 * 3600 * 1000)
    const s = toLocalDT(past), e = toLocalDT(now)
    setStart(s); setEnd(e); setActiveShortcut(null); onSearch(s, e)
  }

  return (
    <div style={{
      background: 'var(--bg1)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 16px',
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
    }}>
      {[['เริ่ม', start, setStart], ['สิ้นสุด', end, setEnd]].map(([label, val, set]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</span>
          <input type="datetime-local" value={val} onChange={e => set(e.target.value)}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', padding: '6px 10px', fontSize: 12, outline: 'none' }} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 4 }}>
        {[{h:1,label:'1H'},{h:4,label:'4H'},{h:8,label:'8H'},{h:24,label:'24H'}].map(({h,label}) => (
          <button key={h} onClick={() => setRangeH(h)} style={{
            padding: '6px 10px', fontSize: 11, fontWeight: 500, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
            background: activeShortcut === h ? 'var(--blue-dim)' : 'var(--bg2)',
            border: `1px solid ${activeShortcut === h ? 'var(--blue)' : 'var(--border)'}`,
            color: activeShortcut === h ? 'var(--blue)' : 'var(--text-2)',
          }}>{label}</button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-ghost" onClick={handleReset}>Reset</button>
        <button className="btn-primary" onClick={() => onSearch(start, end)}>🔍 Search</button>
      </div>
      {start && end && (() => {
        const diffH = (new Date(end) - new Date(start)) / 3600000
        return diffH > 24 ? (
          <div style={{ width: '100%', fontSize: 10, color: 'var(--amber)', background: 'var(--amber-dim)', border: '1px solid rgba(210,153,34,0.25)', borderRadius: 6, padding: '4px 10px' }}>
            ⚠ ช่วงที่เลือกยาวกว่า 24 ชม. จะแสดงผลแค่ 720 records ล่าสุด
          </div>
        ) : null
      })()}
    </div>
  )
}

// ── Poll options ──────────────────────────────────────────
const POLL_OPTIONS = [
  { label: 'Off',   value: null   },
  { label: '5s',    value: 5_000  },
  { label: '10s',   value: 10_000 },
  { label: '30s',   value: 30_000 },
  { label: '1 min', value: 60_000 },
]

// ── DashboardPage ─────────────────────────────────────────
export default function DashboardPage() {
  const { user }    = useAuth()
  const [comp, setComp]         = useState('COMP-01')
  const [start, setStart]       = useState('')
  const [end,   setEnd]         = useState('')
  const [connStatus, setConnStatus]     = useState('connecting')
  const [liveMode,   setLiveMode]       = useState(true)
  const [pollInterval, setPollInterval] = useState(5_000)
  const [selectedDiag, setSelectedDiag] = useState(null)
  const [selectedTs,   setSelectedTs]   = useState(null)
  const [selectedIdx,  setSelectedIdx]  = useState(null)
  const [phData,  setPhData]            = useState(null)
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [staleSeconds, setStaleSeconds] = useState(0)
  const [alarmPopup,      setAlarmPopup]      = useState(null)
  const [popupDismissed,  setPopupDismissed]  = useState(false)
  const [kpiKeys, setKpiKeys] = useState(() => loadKpiConfig())
  const [copPanelW, setCopPanelW] = useState(0)
  const [secPanelW, setSecPanelW] = useState(0)

  const reportRef    = useRef(null)
  const copScrollRef = useRef(null)
  const pressScrollRef = useRef(null)
  const tempScrollRef  = useRef(null)
  const shScrollRef    = useRef(null)
  const pwScrollRef    = useRef(null)
  const copPanelRef  = useRef(null)
  const secPanelRef  = useRef(null)

  const { records, loading, error, fetch, isPolling } = useMetrics({ pollInterval })

  const doFetch = useCallback((s, e) => {
    fetch(comp, s !== undefined ? s : start, e !== undefined ? e : end)
  }, [comp, start, end, fetch])

  // initial load
  useEffect(() => {
    const now = new Date(), past = new Date(now - 2 * 3600 * 1000)
    const s = toLocalDT(past), e = toLocalDT(now)
    setStart(s); setEnd(e); fetch(comp, s, e)
  }, [])

  useEffect(() => {
    if (loading)        setConnStatus('connecting')
    else if (error)     setConnStatus('error')
    else                setConnStatus('live')
  }, [loading, error, isPolling])

  useEffect(() => { setPhData(null) }, [comp])

  // update lastUpdated + trigger popup when records change
  useEffect(() => {
    if (!records.length) return
    setLastUpdated(Date.now())
    setStaleSeconds(0)
    getPHDiagram(comp).then(r => setPhData(r.data)).catch(() => {})
    // alarm popup
    const alarms = records[0]?.diagnosis?.alarms || []
    if (alarms.length) {
      setPopupDismissed(false)
      setAlarmPopup({ alarms, timestamp: records[0].timestamp })
    } else {
      setPopupDismissed(false)
    }
  }, [records, comp])

  // stale timer
  useEffect(() => {
    const id = setInterval(() => {
      if (!lastUpdated) return
      setStaleSeconds(Math.floor((Date.now() - lastUpdated) / 1000))
    }, 30_000)
    return () => clearInterval(id)
  }, [lastUpdated])

  // listen kpi-config-updated
  useEffect(() => {
    const handler = () => setKpiKeys(loadKpiConfig())
    window.addEventListener('kpi-config-updated', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('kpi-config-updated', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  // panel width observer
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        if (e.target === copPanelRef.current) setCopPanelW(e.contentRect.width)
        if (e.target === secPanelRef.current) setSecPanelW(e.contentRect.width)
      }
    })
    if (copPanelRef.current) obs.observe(copPanelRef.current)
    if (secPanelRef.current) obs.observe(secPanelRef.current)
    return () => obs.disconnect()
  }, [])

  // auto-scroll charts
  useEffect(() => {
    if (!records.length) return
    requestAnimationFrame(() => {
      [copScrollRef, pressScrollRef, tempScrollRef, shScrollRef, pwScrollRef].forEach(r => {
        if (r.current) r.current.scrollLeft = r.current.scrollWidth
      })
    })
  }, [records])

  // ── Derived ─────────────────────────────────────────────
  const latest = records[0]?.diagnosis ?? null
  const rows   = [...records].reverse()
  const labels = rows.map(r => formatThaiTime(r.timestamp))
  const diags  = rows.map(r => r.diagnosis || {})
  const inputs = rows.map(r => r.inputs_snapshot || {})

  const latestAlarms      = records[0]?.diagnosis?.alarms || []
  const hasActiveCritical = latestAlarms.some(a => a.severity === 'Critical')
  const hasActiveWarning  = latestAlarms.some(a => a.severity === 'Warning')
  const isStale           = isPolling && staleSeconds > 180

  const alarmSummary = (() => {
    let critical = 0, warning = 0
    records.forEach(r => {
      ;(r.diagnosis?.alarms || []).forEach(a => {
        if (a.severity === 'Critical') critical++; else warning++
      })
    })
    return { critical, warning, total: critical + warning }
  })()

  const n = v => (typeof v === 'number' ? v : null)

  // timestamp ยันวินาที
  const formatFull = (str) => {
    if (!str) return '--'
    return new Date(str).toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok', hour12: false,
      day: '2-digit', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  const getWarn = (key, val) => {
    if (val === null || val === undefined) return ''
    const v = Number(val)
    switch (key) {
      case 'cop':            return v < 1.5 ? 'Low Efficiency' : ''
      case 'superheat_suc':  return v < 0 ? 'Floodback Risk' : v > 15 ? 'High Superheat' : ''
      case 'subcooling':     return v < 2 ? 'Low Subcooling' : v > 15 ? 'High Subcooling' : ''
      case 'pressure_ratio': return v > 10 ? 'High Ratio' : ''
      default:               return ''
    }
  }
  const KPI_ACCENT = {
    power_kw:'var(--cyan)', cop:'var(--green)', q_e_kw:'var(--amber)',
    m_dot_kgh:'var(--blue)', superheat_suc:'var(--red)', subcooling:'var(--purple)',
    pressure_ratio:'var(--orange)', t_evap_c:'var(--cyan)', t_cond_c:'var(--red)',
    eta_is_pct:'var(--green)', h1:'var(--text-2)', h2:'var(--text-2)', h3:'var(--text-2)',
    q_l_kgkg:'var(--amber)', w_comp_kgkg:'var(--orange)', sp_kg:'var(--cyan)',
    dp_kg:'var(--red)', st_c:'var(--cyan)', dt_c:'var(--red)',
    liquid_temp_c:'var(--purple)', current_amp:'var(--amber)',
    evaporator_room_temp_c:'var(--blue)', condenser_temp_c:'var(--orange)',
  }
  const warns = {
    cop: n(latest?.cop) !== null && n(latest?.cop) < 1.5 ? 'Low Efficiency' : '',
    sh:  n(latest?.superheat_suc) !== null
           ? n(latest?.superheat_suc) < 0  ? 'Floodback Risk'
           : n(latest?.superheat_suc) > 15 ? 'High Superheat' : '' : '',
    sc:  n(latest?.subcooling) !== null
           ? n(latest?.subcooling) < 2  ? 'Low Subcooling'
           : n(latest?.subcooling) > 15 ? 'High Subcooling' : '' : '',
    pr:  n(latest?.pressure_ratio) !== null && n(latest?.pressure_ratio) > 10 ? 'High Ratio' : '',
  }

  // sparkline data (20 records ล่าสุด ascending)
  const sparkRows = rows.slice(-20)
  const sparklines = {
    power_kw:       sparkRows.map(r => num(r.diagnosis?.power_kw)),
    cop:            sparkRows.map(r => num(r.diagnosis?.cop)),
    q_e_kw:         sparkRows.map(r => num(r.diagnosis?.q_e_kw)),
    superheat_suc:  sparkRows.map(r => num(r.diagnosis?.superheat_suc)),
    subcooling:     sparkRows.map(r => num(r.diagnosis?.subcooling)),
    pressure_ratio: sparkRows.map(r => num(r.diagnosis?.pressure_ratio)),
  }

  // ── Export ────────────────────────────────────────────────
  const flattenRecord = r => ({
    Timestamp:          formatThaiTime(r.timestamp),
    Compressor:         r.compressor_id,
    'SP (kg/cm²)':      r.inputs_snapshot?.sp_kg         ?? '--',
    'DP (kg/cm²)':      r.inputs_snapshot?.dp_kg         ?? '--',
    'ST (°C)':          r.inputs_snapshot?.st_c          ?? '--',
    'DT (°C)':          r.inputs_snapshot?.dt_c          ?? '--',
    'Liquid Temp (°C)': r.inputs_snapshot?.liquid_temp_c ?? '--',
    'Current (A)':      r.inputs_snapshot?.current_amp   ?? '--',
    COP:                r.diagnosis?.cop            ?? '--',
    'P_comp (kW)':      r.diagnosis?.power_kw       ?? '--',
    'Q_e (kW)':         r.diagnosis?.q_e_kw         ?? '--',
    'Superheat (K)':    r.diagnosis?.superheat_suc  ?? '--',
    'Subcooling (K)':   r.diagnosis?.subcooling     ?? '--',
    'Press. Ratio':     r.diagnosis?.pressure_ratio ?? '--',
    'Mass Flow (kg/h)': r.diagnosis?.m_dot_kgh      ?? '--',
    Alarms: (r.diagnosis?.alarms || []).map(a => a.title).join('; '),
  })

  const exportCSV = () => {
    if (!records.length) return
    const data   = records.map(flattenRecord)
    const header = Object.keys(data[0]).join(',')
    const body   = data.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n')
    const blob   = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href = url; a.download = `dashboard_${comp}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportXLSX = () => {
    if (!records.length) return
    const ws = XLSX.utils.json_to_sheet(records.map(flattenRecord))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, comp)
    XLSX.writeFile(wb, `dashboard_${comp}.xlsx`)
  }

  // ── showRecord ────────────────────────────────────────────
  const showRecord = (idx) => {
    const rec = rows[idx]
    if (!rec) return
    setSelectedDiag(rec.diagnosis)
    setSelectedTs(rec.timestamp)
    setSelectedIdx(idx)
    getPHDiagram(comp, { record_id: rec._id }).then(r => setPhData(r.data)).catch(() => {})
    setTimeout(() => {
      if (reportRef.current) reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  // ── P-H chart data ────────────────────────────────────────
  const phXRange = (() => {
    if (!phData?.cycle) return { min: 150, max: 1800 }
    const pts = [phData.cycle.point1, phData.cycle.point2, phData.cycle.point3, phData.cycle.point4].filter(Boolean)
    if (!pts.length) return { min: 150, max: 1800 }
    const hs  = pts.map(p => p.h)
    const pad = (Math.max(...hs) - Math.min(...hs)) * 0.15
    return { min: Math.floor(Math.min(...hs) - pad), max: Math.ceil(Math.max(...hs) + pad) }
  })()

  const phChartData = phData ? {
    datasets: [
      { label: 'Saturation liquid', data: phData.saturation_dome.liquid.map(p => ({ x: p.h, y: p.p })), borderColor: '#39c5cf', backgroundColor: 'rgba(57,197,207,0.06)', borderWidth: 1.5, showLine: true, tension: 0, pointRadius: 0, fill: true },
      { label: 'Saturation vapour', data: phData.saturation_dome.vapour.map(p => ({ x: p.h, y: p.p })), borderColor: '#39c5cf', backgroundColor: 'transparent', borderWidth: 1.5, showLine: true, tension: 0, pointRadius: 0 },
      { label: 'Cycle', data: phData.cycle ? [phData.cycle.point1, phData.cycle.point2, phData.cycle.point3, phData.cycle.point4, phData.cycle.point1].filter(Boolean).map(p => ({ x: p.h, y: p.p })) : [], borderColor: '#f0883e', backgroundColor: '#f0883e', borderWidth: 2, showLine: true, tension: 0, pointRadius: [5,5,5,5,0], pointBackgroundColor: '#f0883e', pointBorderColor: '#161b22', pointBorderWidth: 2 },
    ],
  } : null

  // ── COP annotation config ─────────────────────────────────
  const copAnnotation = selectedIdx !== null ? {
    annotations: {
      selectedLine: {
        type: 'line', xMin: selectedIdx, xMax: selectedIdx,
        borderColor: '#58a6ff', borderWidth: 1.5, borderDash: [4, 3],
      },
      selectedPoint: {
        type: 'point', xValue: selectedIdx,
        yValue: diags[selectedIdx]?.cop ?? 0,
        radius: 7, borderColor: '#58a6ff', borderWidth: 2,
        backgroundColor: 'rgba(88,166,255,0.15)',
      },
      selectedLabel: {
        type: 'label', xValue: selectedIdx,
        yValue: diags[selectedIdx]?.cop ?? 0,
        yAdjust: -22,
        content: [formatFull(rows[selectedIdx]?.timestamp)],
        color: '#58a6ff',
        font: { size: 9, family: 'JetBrains Mono, monospace' },
        backgroundColor: 'rgba(88,166,255,0.1)',
        borderColor: 'rgba(88,166,255,0.3)',
        borderWidth: 1, borderRadius: 4,
        padding: { x: 6, y: 3 },
      },
    }
  } : { annotations: {} }

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)' }}>
      <Navbar connStatus={connStatus} />

      {/* Greeting */}
      {user?.username && (
        <div style={{ padding: '8px 20px', background: 'var(--bg1)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>สวัสดี, {user.username}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: user.role === 'admin' ? 'var(--blue-dim)' : 'var(--bg3)', color: user.role === 'admin' ? 'var(--blue)' : 'var(--text-3)', border: `1px solid ${user.role === 'admin' ? 'var(--blue)' : 'var(--border)'}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {user.role === 'admin' ? 'Admin' : 'User'}
          </span>
        </div>
      )}

      {/* Stale warning */}
      {isStale && (
        <div style={{ padding: '7px 20px', fontSize: 12, fontWeight: 500, background: 'var(--amber-dim)', borderBottom: '1px solid rgba(210,153,34,0.3)', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠️ ไม่มีข้อมูลใหม่มานาน {Math.floor(staleSeconds / 60)} นาที — ตรวจสอบการเชื่อมต่อ sensor
        </div>
      )}

      {/* Active alarm banner */}
      {(hasActiveCritical || hasActiveWarning) && (
        <div style={{ padding: '7px 20px', background: hasActiveCritical ? 'var(--red-dim)' : 'var(--amber-dim)', borderBottom: `1px solid ${hasActiveCritical ? 'rgba(248,81,73,0.3)' : 'rgba(210,153,34,0.3)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13 }}>{hasActiveCritical ? '🔴' : '🟡'}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: hasActiveCritical ? 'var(--red)' : 'var(--amber)' }}>
            {hasActiveCritical ? 'CRITICAL' : 'WARNING'} — {latestAlarms.map(a => a.title).join(' · ')}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>
            {formatFull(records[0]?.timestamp)}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)' }}>

        {/* Sidebar */}
        <div style={{ width: 160, flexShrink: 0, background: 'var(--bg1)', borderRight: '1px solid var(--border)', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '0 16px 10px' }}>Compressor</div>
          {COMPRESSORS.map(c => (
            <button key={c} onClick={() => {
              setComp(c)
              const now = new Date(), past = new Date(now - 2 * 3600 * 1000)
              const s = toLocalDT(past), e = toLocalDT(now)
              setStart(s); setEnd(e); fetch(c, s, e)
            }}
              style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13, fontWeight: comp === c ? 600 : 400, border: 'none', borderRadius: 0, background: comp === c ? 'var(--blue-dim)' : 'transparent', color: comp === c ? 'var(--blue)' : 'var(--text-2)', borderLeft: `3px solid ${comp === c ? 'var(--blue)' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (comp !== c) e.currentTarget.style.background = 'var(--bg2)' }}
              onMouseLeave={e => { if (comp !== c) e.currentTarget.style.background = 'transparent' }}
            >{c}</button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14, overflowX: 'hidden' }}>

          {/* 1. Filter bar */}
          <FilterBar start={start} setStart={setStart} end={end} setEnd={setEnd} onSearch={doFetch} />

          {/* 1b. Live Mode bar */}
          <div style={{ background: 'var(--bg1)', border: `1px solid ${isPolling ? 'var(--green)' : 'var(--border)'}`, borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.3s', flexWrap: 'wrap' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isPolling ? 'var(--green)' : 'var(--text-3)', boxShadow: isPolling ? '0 0 0 3px rgba(63,185,80,0.25)' : 'none', flexShrink: 0, animation: isPolling ? 'pulse-dot 1.5s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: isPolling ? 'var(--green)' : 'var(--text-2)', minWidth: 80 }}>{isPolling ? '⚡ Live Mode' : 'Static Mode'}</span>

            {/* Toggle */}
            <button onClick={() => {
              const next = !liveMode; setLiveMode(next)
              if (!next) { setPollInterval(null) } else {
                setPollInterval(5_000)
                const now = new Date(), past = new Date(now - 2 * 3600 * 1000)
                const s = toLocalDT(past), e = toLocalDT(now)
                setStart(s); setEnd(e); fetch(comp, s, e)
              }
            }} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: liveMode ? 'var(--green)' : 'var(--bg2)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, outline: '1px solid var(--border)' }}>
              <span style={{ position: 'absolute', top: 3, left: liveMode ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: liveMode ? '#fff' : 'var(--text-3)', transition: 'left 0.2s', display: 'block' }} />
            </button>

            {liveMode && (
              <>
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4 }}>Refresh ทุก</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {POLL_OPTIONS.filter(o => o.value !== null).map(o => (
                    <button key={o.value} onClick={() => setPollInterval(o.value)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', background: pollInterval === o.value ? 'rgba(63,185,80,0.15)' : 'var(--bg2)', border: `1px solid ${pollInterval === o.value ? 'var(--green)' : 'var(--border)'}`, color: pollInterval === o.value ? 'var(--green)' : 'var(--text-2)' }}>{o.label}</button>
                  ))}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 'auto', fontStyle: 'italic' }}>ข้อมูลจะอัปเดตอัตโนมัติ • ช่วงเวลาจะเลื่อนตามปัจจุบัน</span>
              </>
            )}

            {lastUpdated && !liveMode && (
              <span style={{ fontSize: 10, fontFamily: 'monospace', marginLeft: 'auto', color: isStale ? 'var(--amber)' : 'var(--text-3)' }}>
                {isStale ? '⚠ ' : ''}อัพเดทล่าสุด {new Date(lastUpdated).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            )}

            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <button onClick={exportCSV} disabled={!records.length} className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px', opacity: records.length ? 1 : 0.4 }}>⬇ CSV</button>
              <button onClick={exportXLSX} disabled={!records.length} className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px', opacity: records.length ? 1 : 0.4 }}>⬇ Excel</button>
            </div>
          </div>

          {/* 2a. Alarm summary badge */}
          {/* {alarmSummary.total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: alarmSummary.critical > 0 ? 'var(--red-dim)' : 'var(--amber-dim)', border: `1px solid ${alarmSummary.critical > 0 ? 'rgba(248,81,73,0.3)' : 'rgba(210,153,34,0.3)'}` }}>
              <span style={{ fontSize: 13 }}>{alarmSummary.critical > 0 ? '🔴' : '🟡'}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: alarmSummary.critical > 0 ? 'var(--red)' : 'var(--amber)' }}>
                {alarmSummary.critical > 0 && `${alarmSummary.critical} Critical`}
                {alarmSummary.critical > 0 && alarmSummary.warning > 0 && ' · '}
                {alarmSummary.warning > 0 && `${alarmSummary.warning} Warning`}
                {' '}ในช่วงที่เลือก
              </span>
              <span onClick={() => reportRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 'auto', cursor: 'pointer', textDecoration: 'underline' }}>ดู Alarm Log ↓</span>
            </div>
          )} */}

          {/* 2. KPI cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(kpiKeys.length, 6)}, 1fr)`,
            gap: 10,
          }}>
            {kpiKeys.map(key => {
              const kpi  = KPI_MAP[key]
              if (!kpi) return null
              const val  = records[0] ? getKpiValue(records[0], key) : null
              const warn = getWarn(key, val)
              const col  = KPI_ACCENT[key] ?? 'var(--text-2)'
              const sparkData = sparkRows.map(r => {
                const v = getKpiValue(r, key)
                return typeof v === 'number' ? v : null
              })
              return (
                <KPICard key={key} label={kpi.label} value={val}
                  unit={kpi.unit} accent={col} warn={warn}
                  sparkline={<Sparkline data={sparkData} color={col} />} />
              )
            })}
          </div>

          {/* 3. COP Trend + P-H Diagram */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 14 }}>
            <div className="panel" style={{ minWidth: 0 }} ref={copPanelRef}>
              <div className="panel-header">
                <span className="panel-title">COP Trend</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[['Actual','var(--green)'],['System','var(--amber)'],['Cycle','var(--pink)']].map(([l,c]) => (
                    <span key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'var(--text-2)', fontFamily:'monospace' }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }}/>{l}
                    </span>
                  ))}
                </div>
              </div>
              {rows.length === 0 ? (
                <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--bg2)', borderRadius: 8 }}>
                  <span style={{ fontSize: 22, opacity: 0.4 }}>📭</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>ไม่พบข้อมูลในช่วงเวลาที่คุณเลือก</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>ลองเปลี่ยนช่วงวันที่หรือเลือก compressor อื่น</span>
                </div>
              ) : (
                <div className="cop-scroll" style={{ maxWidth: '100%' }} ref={copScrollRef}>
                  <div style={{ position: 'relative', height: 220, width: Math.max(rows.length * 30, copPanelW || 1) }}>
                    <Line
                      key={`${rows.length}-${copPanelW}`}
                      data={{ labels, datasets: [mkDs('COP', diags.map(d => num(d.cop)), '#3fb950')] }}
                      width={Math.max(rows.length * 30, copPanelW || 1)}
                      height={220}
                      options={{
                        ...CHART_DEFAULTS, responsive: false,
                        onClick: (_, els) => els.length && showRecord(els[0].index),
                        onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default' },
                        plugins: {
                          ...CHART_DEFAULTS.plugins,
                          tooltip: { ...CHART_DEFAULTS.plugins.tooltip, mode: 'point', intersect: true, callbacks: { footer: () => 'คลิกเพื่อดู Report ณ เวลานี้' } },
                          annotation: copAnnotation,
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <span className="panel-title">P-H Diagram</span>
                <span style={{ fontSize: 9, color: 'var(--text-3)', fontStyle: 'italic' }}>{phData ? 'Live data' : 'Loading…'}</span>
              </div>
              <div style={{ flex: 1, position: 'relative', minHeight: 180 }}>
                {phChartData && (
                  <Scatter data={phChartData} options={{
                    responsive: true, maintainAspectRatio: false, animation: false,
                    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1c2333', borderColor: '#30363d', borderWidth: 1, bodyColor: '#e6edf3' } },
                    scales: {
                      x: { type: 'linear', min: phXRange.min, max: phXRange.max, title: { display: true, text: 'h (kJ/kg)', color: '#8b949e', font: { size: 9 } }, ticks: { color: '#8b949e', maxTicksLimit: 5 }, grid: { color: 'rgba(48,54,61,0.4)' } },
                      y: { type: 'logarithmic', min: 0.08, max: 7, title: { display: true, text: 'P (MPa)', color: '#8b949e', font: { size: 9 } }, ticks: { color: '#8b949e', callback: v => v < 1 ? v.toFixed(2) : v.toFixed(1) }, grid: { color: 'rgba(48,54,61,0.4)' } },
                    },
                  }} />
                )}
              </div>
            </div>
          </div>

          {/* 4. Secondary charts 2×2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }} ref={secPanelRef}>
            {/* Pressure */}
            <div className="panel" style={{ minWidth: 0 }}>
              <div className="panel-header">
                <span className="panel-title">Pressure</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['SP','var(--cyan)'],['DP','var(--red)']].map(([l,c]) => (
                    <span key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--text-2)', fontFamily:'monospace' }}>
                      <span style={{ width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>{l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="cop-scroll" ref={pressScrollRef}>
                <div style={{ position: 'relative', height: 160, width: Math.max(rows.length * 20, (secPanelW / 2 - 20) || 1) }}>
                  <Line key={`${rows.length}-${secPanelW}`} width={Math.max(rows.length * 20, (secPanelW / 2 - 20) || 1)} height={160}
                    data={{ labels, datasets: [mkDs('SP', inputs.map(i => num(i.sp_kg)), '#39c5cf'), mkDs('DP', inputs.map(i => num(i.dp_kg)), '#f85149')] }}
                    options={{ ...CHART_DEFAULTS, responsive: false, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: 'kg/cm²', color: '#8b949e', font: { size: 9 } } } } }} />
                </div>
              </div>
            </div>

            {/* Temperature */}
            <div className="panel" style={{ minWidth: 0 }}>
              <div className="panel-header">
                <span className="panel-title">Temperature</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['ST','var(--cyan)'],['DT','var(--red)'],['Liquid','var(--purple)']].map(([l,c]) => (
                    <span key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--text-2)', fontFamily:'monospace' }}>
                      <span style={{ width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>{l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="cop-scroll" ref={tempScrollRef}>
                <div style={{ position: 'relative', height: 160, width: Math.max(rows.length * 20, (secPanelW / 2 - 20) || 1) }}>
                  <Line key={`${rows.length}-${secPanelW}`} width={Math.max(rows.length * 20, (secPanelW / 2 - 20) || 1)} height={160}
                    data={{ labels, datasets: [mkDs('ST', inputs.map(i => num(i.st_c)), '#39c5cf'), mkDs('DT', inputs.map(i => num(i.dt_c)), '#f85149'), mkDs('Liquid', inputs.map(i => num(i.liquid_temp_c)), '#a371f7')] }}
                    options={{ ...CHART_DEFAULTS, responsive: false, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: '°C', color: '#8b949e', font: { size: 9 } } } } }} />
                </div>
              </div>
            </div>

            {/* Superheat / Subcooling */}
            <div className="panel" style={{ minWidth: 0 }}>
              <div className="panel-header">
                <span className="panel-title">Superheat / Subcooling</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['Superheat','var(--red)'],['Subcooling','var(--purple)']].map(([l,c]) => (
                    <span key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--text-2)', fontFamily:'monospace' }}>
                      <span style={{ width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>{l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="cop-scroll" ref={shScrollRef}>
                <div style={{ position: 'relative', height: 160, width: Math.max(rows.length * 20, (secPanelW / 2 - 20) || 1) }}>
                  <Line key={`${rows.length}-${secPanelW}`} width={Math.max(rows.length * 20, (secPanelW / 2 - 20) || 1)} height={160}
                    data={{ labels, datasets: [mkDs('Superheat', diags.map(d => num(d.superheat_suc)), '#f85149'), mkDs('Subcooling', diags.map(d => num(d.subcooling)), '#a371f7')] }}
                    options={{ ...CHART_DEFAULTS, responsive: false, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: '°C', color: '#8b949e', font: { size: 9 } } } } }} />
                </div>
              </div>
            </div>

            {/* Power & Capacity */}
            <div className="panel" style={{ minWidth: 0 }}>
              <div className="panel-header">
                <span className="panel-title">Power &amp; Capacity</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['Power kW','var(--orange)'],['Q_L kW','var(--cyan)']].map(([l,c]) => (
                    <span key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--text-2)', fontFamily:'monospace' }}>
                      <span style={{ width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>{l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="cop-scroll" ref={pwScrollRef}>
                <div style={{ position: 'relative', height: 160, width: Math.max(rows.length * 20, (secPanelW / 2 - 20) || 1) }}>
                  <Line key={`${rows.length}-${secPanelW}`} width={Math.max(rows.length * 20, (secPanelW / 2 - 20) || 1)} height={160}
                    data={{ labels, datasets: [mkDs('P_comp kW', diags.map(d => num(d.power_kw)), '#f0883e'), mkDs('Q_e kW', diags.map(d => num(d.q_e_kw)), '#39c5cf')] }}
                    options={{ ...CHART_DEFAULTS, responsive: false, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: 'kW', color: '#8b949e', font: { size: 9 } } } } }} />
                </div>
              </div>
            </div>
          </div>

          {/* 5. Analysis report + Alarm history */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} ref={reportRef}>
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Analysis Report</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedTs && (
                    <span style={{ fontSize: 10, color: 'var(--blue)', background: 'var(--blue-dim)', border: '1px solid rgba(88,166,255,0.2)', padding: '2px 8px', borderRadius: 20, fontFamily: 'monospace' }}>
                      📍 {formatFull(selectedTs)}
                    </span>
                  )}
                  {selectedDiag && (
                    <button onClick={() => { setSelectedDiag(null); setSelectedTs(null); setSelectedIdx(null) }}
                      style={{ fontSize: 10, fontWeight: 600, padding: '2px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text-2)', cursor: 'pointer' }}>
                      ↺ ล่าสุด
                    </button>
                  )}
                </div>
              </div>
              <DiagnosisReport diag={selectedDiag ?? latest} />
            </div>

            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Alarm History</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedTs && (
                    <span style={{ fontSize: 10, color: 'var(--blue)', background: 'var(--blue-dim)', border: '1px solid rgba(88,166,255,0.2)', padding: '2px 8px', borderRadius: 20, fontFamily: 'monospace' }}>
                      📍 {formatFull(selectedTs)}
                    </span>
                  )}
                  {selectedDiag && (
                    <button onClick={() => { setSelectedDiag(null); setSelectedTs(null); setSelectedIdx(null) }}
                      style={{ fontSize: 10, fontWeight: 600, padding: '2px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text-2)', cursor: 'pointer' }}>
                      ↺ ล่าสุด
                    </button>
                  )}
                </div>
              </div>
              <AlarmLog records={selectedDiag ? [{ diagnosis: selectedDiag, timestamp: selectedTs }] : records} singleRecord={!!selectedDiag} />
            </div>
          </div>

        </div>
      </div>

      {/* Alarm Popup — fixed bottom-right */}
      {alarmPopup && !popupDismissed && (
        <AlarmPopup
          popup={alarmPopup}
          formatFull={formatFull}
          onClose={() => setPopupDismissed(true)}
          onDetail={() => {
            setPopupDismissed(true)
            reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        />
      )}
    </div>
  )
}