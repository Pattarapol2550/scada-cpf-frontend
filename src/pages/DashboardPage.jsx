import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import KPICard from '../components/dashboard/KPICard'
import AlarmLog from '../components/dashboard/AlarmLog'
import DiagnosisReport from '../components/dashboard/DiagnosisReport'
import Sparkline from '../components/dashboard/Sparkline'
import AlarmPopup from '../components/dashboard/AlarmPopup'
import FilterBar from '../components/dashboard/FilterBar'
import FleetOverview from '../components/dashboard/FleetOverview'
import { useMetrics } from '../hooks/useMetrics'
import { useAuth } from '../context/AuthContext'
import { getPHDiagram } from '../services/api'
import { COMPRESSORS, toLocalDT, formatThaiTime, formatFull, num } from '../utils/format'
import { cyclePoints, getPHXRange, normalizePHCycle } from '../utils/phDiagram'
import { CHART_DEFAULTS, mkDs } from '../utils/chartConfig'
import { KPI_MAP, loadKpiConfig, getKpiValue } from '../utils/kpiConfig'
import { exportCSV, exportXLSX } from '../utils/exportUtils'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, BarElement, ArcElement,
  Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Scatter } from 'react-chartjs-2'
import Annotation from 'chartjs-plugin-annotation'

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, BarElement, ArcElement,
  Tooltip, Legend, Filler,
  Annotation
)

const POLL_OPTIONS = [
  { label: '5s',    value: 5_000  },
  { label: '10s',   value: 10_000 },
  { label: '30s',   value: 30_000 },
  { label: '1 min', value: 60_000 },
]

const KPI_ACCENT = {
  power_kw: 'var(--cyan)', cop: 'var(--green)', q_e_kw: 'var(--amber)',
  m_dot_kgh: 'var(--blue)', superheat_suc: 'var(--red)', subcooling: 'var(--purple)',
  pressure_ratio: 'var(--orange)', t_evap_c: 'var(--cyan)', t_cond_c: 'var(--red)',
  eta_is_pct: 'var(--green)', h1: 'var(--text-2)', h2: 'var(--text-2)', h3: 'var(--text-2)',
  q_l_kjkg: 'var(--amber)', w_comp_kjkg: 'var(--orange)', sp_kg: 'var(--cyan)',
  dp_kg: 'var(--red)', st_c: 'var(--cyan)', dt_c: 'var(--red)',
  liquid_temp_c: 'var(--purple)', current_amp: 'var(--amber)',
  evaporator_room_temp_c: 'var(--blue)', condenser_temp_c: 'var(--orange)',
}

function getWarn(key, val) {
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

export default function DashboardPage() {
  const { user }    = useAuth()
  const location    = useLocation()
  const [comp, setComp] = useState(() => {
    const saved = localStorage.getItem('dashboard-comp')
    return saved === 'OVERVIEW' || COMPRESSORS.includes(saved) ? saved : 'OVERVIEW'
  })
  const [start, setStart]                   = useState('')
  const [end, setEnd]                       = useState('')
  const [connStatus, setConnStatus]         = useState('connecting')
  const [liveMode, setLiveMode]             = useState(true)
  const [pollInterval, setPollInterval]     = useState(5_000)
  const [selectedDiag, setSelectedDiag]     = useState(null)
  const [selectedTs, setSelectedTs]         = useState(null)
  const [selectedIdx, setSelectedIdx]       = useState(null)
  const [phData, setPhData]                 = useState(null)
  const [lastUpdated, setLastUpdated]       = useState(null)
  const [staleSeconds, setStaleSeconds]     = useState(0)
  const [alarmPopup, setAlarmPopup]         = useState(null)
  const [popupDismissed, setPopupDismissed] = useState(false)
  const [kpiKeys, setKpiKeys]               = useState(() => loadKpiConfig())
  const [copPanelW, setCopPanelW]           = useState(0)
  const [secPanelW, setSecPanelW]           = useState(0)

  const reportRef      = useRef(null)
  const copScrollRef   = useRef(null)
  const pressScrollRef = useRef(null)
  const tempScrollRef  = useRef(null)
  const shScrollRef    = useRef(null)
  const pwScrollRef    = useRef(null)
  const copPanelRef    = useRef(null)
  const activeCompRef  = useRef(comp)  // always tracks latest comp for async PH callbacks
  const secPanelRef    = useRef(null)

  const { records, loading, error, fetch, isPolling } = useMetrics({ pollInterval })

  const handleSelectComp = useCallback((selectedComp) => {
    localStorage.setItem('dashboard-comp', selectedComp)
    setComp(selectedComp)
    if (selectedComp !== 'OVERVIEW') {
      const now = new Date(), past = new Date(now - 2 * 3600 * 1000)
      const s = toLocalDT(past), e = toLocalDT(now)
      setStart(s); setEnd(e)
      fetch(selectedComp, s, e)
      // Fire PH diagram in parallel — no need to wait for records first
      setPhData(null)
      getPHDiagram(selectedComp)
        .then(r => { if (activeCompRef.current === selectedComp) setPhData(r.data) })
        .catch(() => {})
    }
  }, [fetch])

  useEffect(() => {
    const fromMonitor = location.state?.comp
    const fromInput   = location.state?.fromInput
    const target = fromInput ?? fromMonitor
    if (target && COMPRESSORS.includes(target)) handleSelectComp(target)
  }, [location.state, handleSelectComp])

  const doFetch = useCallback((s, e) => {
    if (comp !== 'OVERVIEW') fetch(comp, s ?? start, e ?? end)
  }, [comp, start, end, fetch])

  useEffect(() => {
    if (comp !== 'OVERVIEW') {
      const now = new Date(), past = new Date(now - 2 * 3600 * 1000)
      const s = toLocalDT(past), e = toLocalDT(now)
      setStart(s); setEnd(e); fetch(comp, s, e)
      getPHDiagram(comp)
        .then(r => { if (activeCompRef.current === comp) setPhData(r.data) })
        .catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading)    setConnStatus('connecting')
    else if (error) setConnStatus('error')
    else            setConnStatus('live')
  }, [loading, error])

  useEffect(() => {
    activeCompRef.current = comp
    setPhData(null)
  }, [comp])

  useEffect(() => {
    if (!records.length || comp === 'OVERVIEW') return
    // Skip if records are stale from the previous compressor
    if (records[0]?.compressor_id !== comp) return
    setLastUpdated(Date.now())
    setStaleSeconds(0)
    const snapComp = comp
    getPHDiagram(snapComp)
      .then(r => { if (activeCompRef.current === snapComp) setPhData({ ...r.data, inputs_snapshot: r.data?.inputs_snapshot ?? records[0]?.inputs_snapshot, diagnosis: r.data?.diagnosis ?? records[0]?.diagnosis }) })
      .catch(() => {})
    const alarms = records[0]?.diagnosis?.alarms || []
    if (alarms.length) {
      setPopupDismissed(false)
      setAlarmPopup({ alarms, timestamp: records[0].timestamp })
    } else {
      setPopupDismissed(false)
    }
  }, [records, comp])

  useEffect(() => {
    const id = setInterval(() => {
      if (!lastUpdated) return
      setStaleSeconds(Math.floor((Date.now() - lastUpdated) / 1000))
    }, 30_000)
    return () => clearInterval(id)
  }, [lastUpdated])

  useEffect(() => {
    const handler = () => setKpiKeys(loadKpiConfig())
    window.addEventListener('kpi-config-updated', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('kpi-config-updated', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

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

  useEffect(() => {
    if (!records.length) return
    requestAnimationFrame(() => {
      [copScrollRef, pressScrollRef, tempScrollRef, shScrollRef, pwScrollRef].forEach(r => {
        if (r.current) r.current.scrollLeft = r.current.scrollWidth
      })
    })
  }, [records])

  // Derived
  const latest  = records[0]?.diagnosis ?? null
  const rows    = [...records].reverse()
  const labels  = rows.map(r => formatThaiTime(r.timestamp))
  const diags   = rows.map(r => r.diagnosis || {})
  const inputs  = rows.map(r => r.inputs_snapshot || {})

  const latestAlarms      = records[0]?.diagnosis?.alarms || []
  const hasActiveCritical = latestAlarms.some(a => a.severity === 'Critical')
  const hasActiveWarning  = latestAlarms.some(a => a.severity === 'Warning')
  const isStale           = isPolling && staleSeconds > 180

  const sparkRows = rows.slice(-20)

  // Export
  const csvFilename  = `dashboard_${comp}.csv`
  const xlsxFilename = `dashboard_${comp}.xlsx`

  const showRecord = (idx) => {
    const rec = rows[idx]
    if (!rec) return
    setSelectedDiag(rec.diagnosis)
    setSelectedTs(rec.timestamp)
    setSelectedIdx(idx)
    const snapComp = comp
    getPHDiagram(snapComp, { record_id: rec._id })
      .then(r => { if (activeCompRef.current === snapComp) setPhData({ ...r.data, inputs_snapshot: r.data?.inputs_snapshot ?? rec.inputs_snapshot, diagnosis: r.data?.diagnosis ?? rec.diagnosis }) })
      .catch(() => {})
    setTimeout(() => {
      if (reportRef.current) reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  const phCycle = normalizePHCycle(phData)
  const phPoints = cyclePoints(phCycle, true)
  const phXRange = getPHXRange(phCycle)

  const phChartData = phData ? {
    datasets: [
      { label: 'Saturation liquid', data: (phData.saturation_dome?.liquid ?? []).map(p => ({ x: p.h, y: p.p })), borderColor: '#39c5cf', backgroundColor: 'rgba(57,197,207,0.06)', borderWidth: 1.5, showLine: true, tension: 0, pointRadius: 0, fill: true },
      { label: 'Saturation vapour', data: (phData.saturation_dome?.vapour ?? []).map(p => ({ x: p.h, y: p.p })), borderColor: '#39c5cf', backgroundColor: 'transparent', borderWidth: 1.5, showLine: true, tension: 0, pointRadius: 0 },
      { label: 'Cycle', data: phPoints.map(p => ({ x: p.h, y: p.p })), borderColor: '#f0883e', backgroundColor: '#f0883e', borderWidth: 2, showLine: true, tension: 0, pointRadius: phPoints.map((_, i) => i === phPoints.length - 1 ? 0 : 5), pointBackgroundColor: '#f0883e', pointBorderColor: '#161b22', pointBorderWidth: 2 },
    ],
  } : null

  const copAnnotation = selectedIdx !== null ? {
    annotations: {
      selectedLine: { type: 'line', xMin: selectedIdx, xMax: selectedIdx, borderColor: '#58a6ff', borderWidth: 1.5, borderDash: [4, 3] },
      selectedPoint: { type: 'point', xValue: selectedIdx, yValue: diags[selectedIdx]?.cop ?? 0, radius: 7, borderColor: '#58a6ff', borderWidth: 2, backgroundColor: 'rgba(88,166,255,0.15)' },
      selectedLabel: { type: 'label', xValue: selectedIdx, yValue: diags[selectedIdx]?.cop ?? 0, yAdjust: -22, content: [formatFull(rows[selectedIdx]?.timestamp)], color: '#58a6ff', font: { size: 9, family: 'JetBrains Mono, monospace' }, backgroundColor: 'rgba(88,166,255,0.1)', borderColor: 'rgba(88,166,255,0.3)', borderWidth: 1, borderRadius: 4, padding: { x: 6, y: 3 } },
    },
  } : { annotations: {} }

  const secW = Math.max(rows.length * 20, (secPanelW / 2 - 20) || 1)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)' }}>
      <Navbar connStatus={connStatus} />

      {user?.username && (
        <div style={{ padding: '8px 20px', background: 'var(--bg1)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>สวัสดี, {user.username}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: user.role === 'admin' ? 'var(--blue-dim)' : 'var(--bg3)', color: user.role === 'admin' ? 'var(--blue)' : 'var(--text-3)', border: `1px solid ${user.role === 'admin' ? 'var(--blue)' : 'var(--border)'}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {user.role === 'admin' ? 'Admin' : 'User'}
          </span>
        </div>
      )}

      {isStale && (
        <div style={{ padding: '7px 20px', fontSize: 12, fontWeight: 500, background: 'var(--amber-dim)', borderBottom: '1px solid rgba(210,153,34,0.3)', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠️ ไม่มีข้อมูลใหม่มานาน {Math.floor(staleSeconds / 60)} นาที — ตรวจสอบการเชื่อมต่อ sensor
        </div>
      )}

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
          <button onClick={() => handleSelectComp('OVERVIEW')}
            style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13, fontWeight: comp === 'OVERVIEW' ? 600 : 400, border: 'none', borderRadius: 0, background: comp === 'OVERVIEW' ? 'var(--blue-dim)' : 'transparent', color: comp === 'OVERVIEW' ? 'var(--blue)' : 'var(--text-2)', borderLeft: `3px solid ${comp === 'OVERVIEW' ? 'var(--blue)' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s', marginBottom: 12 }}
            onMouseEnter={e => { if (comp !== 'OVERVIEW') e.currentTarget.style.background = 'var(--bg2)' }}
            onMouseLeave={e => { if (comp !== 'OVERVIEW') e.currentTarget.style.background = 'transparent' }}
          >Overview</button>

          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '0 16px 10px' }}>Compressor</div>
          {COMPRESSORS.map(c => (
            <button key={c} onClick={() => handleSelectComp(c)}
              style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13, fontWeight: comp === c ? 600 : 400, border: 'none', borderRadius: 0, background: comp === c ? 'var(--blue-dim)' : 'transparent', color: comp === c ? 'var(--blue)' : 'var(--text-2)', borderLeft: `3px solid ${comp === c ? 'var(--blue)' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (comp !== c) e.currentTarget.style.background = 'var(--bg2)' }}
              onMouseLeave={e => { if (comp !== c) e.currentTarget.style.background = 'transparent' }}
            >{c}</button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14, overflowX: 'hidden' }}>
          {comp === 'OVERVIEW' ? (
            <FleetOverview onSelectComp={handleSelectComp} />
          ) : (
            <>
              {/* Filter bar */}
              <FilterBar start={start} setStart={setStart} end={end} setEnd={setEnd} onSearch={doFetch} />

              {/* Live Mode bar */}
              <div style={{ background: 'var(--bg1)', border: `1px solid ${isPolling ? 'var(--green)' : 'var(--border)'}`, borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.3s', flexWrap: 'wrap' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isPolling ? 'var(--green)' : 'var(--text-3)', boxShadow: isPolling ? '0 0 0 3px rgba(63,185,80,0.25)' : 'none', flexShrink: 0, animation: isPolling ? 'pulse-dot 1.5s ease-in-out infinite' : 'none' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: isPolling ? 'var(--green)' : 'var(--text-2)', minWidth: 80 }}>{isPolling ? '⚡ Live Mode' : 'Static Mode'}</span>

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
                      {POLL_OPTIONS.map(o => (
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
                  <button onClick={() => exportCSV(records, csvFilename)} disabled={!records.length} className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px', opacity: records.length ? 1 : 0.4 }}>⬇ CSV</button>
                  <button onClick={() => exportXLSX(records, xlsxFilename, comp)} disabled={!records.length} className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px', opacity: records.length ? 1 : 0.4 }}>⬇ Excel</button>
                </div>
              </div>

              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(kpiKeys.length, 6)}, 1fr)`, gap: 10 }}>
                {kpiKeys.map(key => {
                  const kpi = KPI_MAP[key]
                  if (!kpi) return null
                  const val      = records[0] ? getKpiValue(records[0], key) : null
                  const warn     = getWarn(key, val)
                  const col      = KPI_ACCENT[key] ?? 'var(--text-2)'
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

              {/* COP Trend + P-H Diagram */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 14 }}>
                <div className="panel" style={{ minWidth: 0 }} ref={copPanelRef}>
                  <div className="panel-header">
                    <span className="panel-title">COP Trend</span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {[['Actual', 'var(--green)'], ['System', 'var(--amber)'], ['Cycle', 'var(--pink)']].map(([l, c]) => (
                        <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
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
                          key={`cop-${copPanelW}`}
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

              {/* Secondary charts 2×2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }} ref={secPanelRef}>
                {[
                  { title: 'Pressure',              ref: pressScrollRef, legend: [['SP', 'var(--cyan)'], ['DP', 'var(--red)']], unit: 'kg/cm²', datasets: [mkDs('SP', inputs.map(i => num(i.sp_kg)), '#39c5cf'), mkDs('DP', inputs.map(i => num(i.dp_kg)), '#f85149')] },
                  { title: 'Temperature',           ref: tempScrollRef,  legend: [['ST', 'var(--cyan)'], ['DT', 'var(--red)'], ['Liquid', 'var(--purple)']], unit: '°C', datasets: [mkDs('ST', inputs.map(i => num(i.st_c)), '#39c5cf'), mkDs('DT', inputs.map(i => num(i.dt_c)), '#f85149'), mkDs('Liquid', inputs.map(i => num(i.liquid_temp_c)), '#a371f7')] },
                  { title: 'Superheat / Subcooling', ref: shScrollRef,   legend: [['Superheat', 'var(--red)'], ['Subcooling', 'var(--purple)']], unit: '°C', datasets: [mkDs('Superheat', diags.map(d => num(d.superheat_suc)), '#f85149'), mkDs('Subcooling', diags.map(d => num(d.subcooling)), '#a371f7')] },
                  { title: 'Power & Capacity',      ref: pwScrollRef,    legend: [['Power kW', 'var(--orange)'], ['Q_L kW', 'var(--cyan)']], unit: 'kW', datasets: [mkDs('P_comp kW', diags.map(d => num(d.power_kw)), '#f0883e'), mkDs('Q_e kW', diags.map(d => num(d.q_e_kw)), '#39c5cf')] },
                ].map(({ title, ref, legend, unit, datasets }) => (
                  <div key={title} className="panel" style={{ minWidth: 0 }}>
                    <div className="panel-header">
                      <span className="panel-title">{title}</span>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {legend.map(([l, c]) => (
                          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="cop-scroll" ref={ref}>
                      <div style={{ position: 'relative', height: 160, width: secW }}>
                        <Line key={`sec-${secPanelW}`} width={secW} height={160}
                          data={{ labels, datasets }}
                          options={{ ...CHART_DEFAULTS, responsive: false, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: unit, color: '#8b949e', font: { size: 9 } } } } }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Analysis Report + Alarm History */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} ref={reportRef}>
                {[
                  { title: 'Analysis Report', content: <DiagnosisReport diag={selectedDiag ?? latest} /> },
                  { title: 'Alarm History',   content: <AlarmLog records={selectedDiag ? [{ diagnosis: selectedDiag, timestamp: selectedTs }] : records} singleRecord={!!selectedDiag} /> },
                ].map(({ title, content }) => (
                  <div key={title} className="panel">
                    <div className="panel-header">
                      <span className="panel-title">{title}</span>
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
                    {content}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

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
