import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from '../components/layout/Navbar'
import KPICard from '../components/dashboard/KPICard'
import AlarmLog from '../components/dashboard/AlarmLog'
import DiagnosisReport from '../components/dashboard/DiagnosisReport'
import { useMetrics } from '../hooks/useMetrics'
import { useAuth } from '../context/AuthContext'
import { getPHDiagram } from '../services/api'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Scatter } from 'react-chartjs-2'
 
ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, Tooltip, Legend, Filler
)
 
// ── Helpers ─────────────────────────────────────────────
const COMPRESSORS = ['COMP-01','COMP-02','COMP-03','COMP-04','COMP-05','COMP-06','COMP-07']
 
function toLocalDT(date) {
  const p = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}
 
function formatThaiTime(str) {
  if (!str) return '--'
  return new Date(str).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', hour12: false,
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}
 
function num(v) { return isNaN(Number(v)) ? null : Number(v) }
 
const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  elements: { point: { radius: 3, hoverRadius: 7 } },
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'point', intersect: true,
      backgroundColor: '#1c2333',
      borderColor: '#30363d', borderWidth: 1,
      titleColor: '#8b949e', bodyColor: '#e6edf3', padding: 10,
    },
  },
  scales: {
    x: { ticks: { maxTicksLimit: 8, maxRotation: 0, color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.5)' } },
    y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.5)' } },
  },
}
 
function mkDs(label, data, color) {
  return {
    label, data,
    borderColor: color,
    backgroundColor: 'transparent',
    borderWidth: 1.5, tension: 0, spanGaps: true, fill: false,
    pointRadius: 3,
    pointBackgroundColor: color,
    pointBorderColor: color,
    pointBorderWidth: 1,
    pointHoverRadius: 7,
    pointHoverBackgroundColor: color,
    pointHoverBorderColor: '#161b22',
    pointHoverBorderWidth: 2,
  }
}
 
// ── FilterBar ────────────────────────────────────────────
function FilterBar({ start, setStart, end, setEnd, onSearch }) {
  const [activeShortcut, setActiveShortcut] = useState(null)
 
  const setRangeH = (hours) => {
    const now = new Date(), past = new Date(now - hours * 3600000)
    const s = toLocalDT(past)
    const e = toLocalDT(now)
    setStart(s)
    setEnd(e)
    setActiveShortcut(hours)
    onSearch(s, e)
  }
 
  const handleReset = () => {
    const now  = new Date()
    const past = new Date(now - 2 * 3600 * 1000)
    const s = toLocalDT(past)
    const e = toLocalDT(now)
    setStart(s)
    setEnd(e)
    setActiveShortcut(null)
    onSearch(s, e)
  }
 
  return (
    <div style={{
      background: 'var(--bg1)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 16px',
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
      transition: 'background 0.2s',
    }}>
      {[['เริ่ม', start, setStart], ['สิ้นสุด', end, setEnd]].map(([label, val, set]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</span>
          <input
            type="datetime-local" value={val}
            onChange={e => set(e.target.value)}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', padding: '6px 10px', fontSize: 12, outline: 'none' }}
          />
        </div>
      ))}
 
      <div style={{ display: 'flex', gap: 4 }}>
        {[{h:1,label:'1H'},{h:4,label:'4H'},{h:8,label:'8H'},{h:24,label:'24H'}].map(({h,label}) => (
          <button key={h}
            onClick={() => setRangeH(h)}
            style={{
              padding: '6px 10px', fontSize: 11, fontWeight: 500,
              background: activeShortcut === h ? 'var(--blue-dim)' : 'var(--bg2)',
              border: `1px solid ${activeShortcut === h ? 'var(--blue)' : 'var(--border)'}`,
              borderRadius: 8,
              color: activeShortcut === h ? 'var(--blue)' : 'var(--text-2)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >{label}</button>
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
 
// ── Main ─────────────────────────────────────────────────
// Poll interval options (ms). null = off.
const POLL_OPTIONS = [
  { label: 'Off',   value: null },
  { label: '5s',    value: 5_000 },
  { label: '10s',   value: 10_000 },
  { label: '30s',   value: 30_000 },
  { label: '1 min', value: 60_000 },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [comp, setComp]     = useState('COMP-01')
  const [start, setStart]   = useState('')
  const [end, setEnd]       = useState('')
  const [connStatus, setConnStatus] = useState('connecting')
  const [liveMode, setLiveMode]     = useState(false)
  const [pollInterval, setPollInterval] = useState(null)  // ms | null
  const [selectedDiag, setSelectedDiag] = useState(null)
  const [selectedTs,   setSelectedTs]   = useState(null)
  const [phData, setPhData] = useState(null)
  const reportRef  = useRef(null)
  const copScrollRef   = useRef(null)
  const pressScrollRef = useRef(null)
  const tempScrollRef  = useRef(null)
  const shScrollRef    = useRef(null)
  const pwScrollRef    = useRef(null)
  const copPanelRef    = useRef(null)
  const [copPanelW, setCopPanelW] = useState(0)
  const [secPanelW, setSecPanelW] = useState(0)
  const secPanelRef    = useRef(null)
 
  const { records, loading, error, fetch, isPolling } = useMetrics({ pollInterval })
 
  const doFetch = useCallback((s, e) => {
    fetch(comp, s !== undefined ? s : start, e !== undefined ? e : end)
  }, [comp, start, end, fetch])
 
  // initial load: 2 ชม.ล่าสุด
  useEffect(() => {
    const now  = new Date()
    const past = new Date(now - 2 * 3600 * 1000)
    const s = toLocalDT(past)
    const e = toLocalDT(now)
    setStart(s)
    setEnd(e)
    fetch(comp, s, e)
  }, [])
 
  useEffect(() => {
    if (loading)          setConnStatus('connecting')
    else if (error)       setConnStatus('error')
    else if (isPolling)   setConnStatus('live')
    else                  setConnStatus('live')
  }, [loading, error, isPolling])
 
  // ล้างกราฟทันทีเมื่อเปลี่ยน comp — ป้องกันกราฟเก่าค้าง
  useEffect(() => {
    setPhData(null)
  }, [comp])

  // Fetch P-H diagram for latest record (หลังจาก records โหลดมาแล้ว)
  useEffect(() => {
    if (!records.length) return
    getPHDiagram(comp).then(r => setPhData(r.data)).catch(() => {})
  }, [records, comp])
 
  // observe panel width เพื่อคำนวณ canvas width
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        if (e.target === copPanelRef.current)  setCopPanelW(e.contentRect.width)
        if (e.target === secPanelRef.current)  setSecPanelW(e.contentRect.width)
      }
    })
    if (copPanelRef.current) obs.observe(copPanelRef.current)
    if (secPanelRef.current) obs.observe(secPanelRef.current)
    return () => obs.disconnect()
  }, [])
 
  // auto-scroll ทุก chart ไปขวาสุด (ล่าสุด) เมื่อ data โหลดเสร็จ
  useEffect(() => {
    if (!records.length) return
    const refs = [copScrollRef, pressScrollRef, tempScrollRef, shScrollRef, pwScrollRef]
    // รอ 1 frame ให้ DOM render canvas ก่อน
    requestAnimationFrame(() => {
      refs.forEach(r => {
        if (r.current) r.current.scrollLeft = r.current.scrollWidth
      })
    })
  }, [records])
 
  const latest = records[0]?.diagnosis ?? null
  const rows   = [...records].reverse()
  const labels = rows.map(r => formatThaiTime(r.timestamp))
  const diags  = rows.map(r => r.diagnosis || {})
  const inputs = rows.map(r => r.inputs_snapshot || {})
 
  const showRecord = (idx) => {
    const rec = rows[idx]
    if (!rec) return
    setSelectedDiag(rec.diagnosis)
    setSelectedTs(rec.timestamp)
    getPHDiagram(comp, rec._id).then(r => setPhData(r.data)).catch(() => {})
    // wait for React re-render before scrolling
    setTimeout(() => {
      if (reportRef.current) {
        reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 150)
  }
 
  // guard: backend returns "--" (string) when value can't be computed
  const n = v => (typeof v === 'number' ? v : null)
 
  // KPI warns — only trigger when value is an actual number
  const warns = {
    cop: n(latest?.cop) !== null && n(latest?.cop) < 1.5 ? 'Low Efficiency' : '',
    sh:  n(latest?.superheat_suc) !== null
           ? n(latest?.superheat_suc) < 0  ? 'Floodback Risk'
           : n(latest?.superheat_suc) > 15 ? 'High Superheat' : ''
           : '',
    sc:  n(latest?.subcooling) !== null
           ? n(latest?.subcooling) < 2  ? 'Low Subcooling'
           : n(latest?.subcooling) > 15 ? 'High Subcooling' : ''
           : '',
    pr:  n(latest?.pressure_ratio) !== null && n(latest?.pressure_ratio) > 10 ? 'High Ratio' : '',
  }
 
  // ── P-H chart data ───────────────────────────────────
  // Auto x-axis range from cycle points
  const phXRange = (() => {
    if (!phData?.cycle) return { min: 150, max: 1800 }
    const pts = [phData.cycle.point1, phData.cycle.point2, phData.cycle.point3, phData.cycle.point4].filter(Boolean)
    if (!pts.length) return { min: 150, max: 1800 }
    const hs = pts.map(p => p.h)
    const pad = (Math.max(...hs) - Math.min(...hs)) * 0.15
    return { min: Math.floor(Math.min(...hs) - pad), max: Math.ceil(Math.max(...hs) + pad) }
  })()

  const phChartData = phData ? {
    datasets: [
      {
        label: 'Saturation liquid',
        data: phData.saturation_dome.liquid.map(p => ({ x: p.h, y: p.p })),
        borderColor: '#39c5cf', backgroundColor: 'rgba(57,197,207,0.06)',
        borderWidth: 1.5, showLine: true, tension: 0, pointRadius: 0, fill: true,
      },
      {
        label: 'Saturation vapour',
        data: phData.saturation_dome.vapour.map(p => ({ x: p.h, y: p.p })),
        borderColor: '#39c5cf', backgroundColor: 'transparent',
        borderWidth: 1.5, showLine: true, tension: 0, pointRadius: 0,
      },
      {
        label: 'Cycle',
        data: phData.cycle ? [
          phData.cycle.point1, phData.cycle.point2,
          phData.cycle.point3, phData.cycle.point4,
          phData.cycle.point1,
        ].filter(Boolean).map(p => ({ x: p.h, y: p.p })) : [],
        borderColor: '#f0883e', backgroundColor: '#f0883e',
        borderWidth: 2, showLine: true, tension: 0,
        pointRadius: [5,5,5,5,0],
        pointBackgroundColor: '#f0883e',
        pointBorderColor: '#161b22', pointBorderWidth: 2,
      },
    ],
  } : null
 
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)' }}>
      <Navbar connStatus={connStatus} />

      {/* ── Greeting + Role badge ── */}
      {user?.username && (
        <div style={{
          padding: '8px 20px',
          background: 'var(--bg1)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
            สวัสดี, {user.username} 
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700,
            padding: '2px 8px', borderRadius: 20,
            background: user.role === 'admin' ? 'var(--blue-dim)' : 'var(--bg3)',
            color:      user.role === 'admin' ? 'var(--blue)'     : 'var(--text-3)',
            border: `1px solid ${user.role === 'admin' ? 'var(--blue)' : 'var(--border)'}`,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {user.role === 'admin' ? 'Admin' : 'User'}
          </span>
        </div>
      )}
 
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)' }}>
 
        {/* ── Sidebar ── */}
        <div style={{
          width: 160, flexShrink: 0,
          background: 'var(--bg1)',
          borderRight: '1px solid var(--border)',
          padding: '16px 0',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '0 16px 10px' }}>
            Compressor
          </div>
          {COMPRESSORS.map(c => (
            <button
              key={c}
              onClick={() => {
                setComp(c)
                const now = new Date(), past = new Date(now - 2 * 3600 * 1000)
                const s = toLocalDT(past), e = toLocalDT(now)
                setStart(s); setEnd(e)
                fetch(c, s, e)
                // If live mode is on, polling will automatically restart with new compressor
              }}
              style={{
                width: '100%', textAlign: 'left',
                padding: '10px 16px',
                fontSize: 13, fontWeight: comp === c ? 600 : 400,
                border: 'none', borderRadius: 0,
                background: comp === c ? 'var(--blue-dim)' : 'transparent',
                color: comp === c ? 'var(--blue)' : 'var(--text-2)',
                borderLeft: `3px solid ${comp === c ? 'var(--blue)' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (comp !== c) e.currentTarget.style.background = 'var(--bg2)' }}
              onMouseLeave={e => { if (comp !== c) e.currentTarget.style.background = 'transparent' }}
            >
              {c}
            </button>
          ))}
        </div>
 
        {/* ── Main content ── */}
        <div style={{ flex: 1, minWidth: 0, padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14, overflowX: 'hidden' }}>
 
        {/* 1. Filter bar */}
        <FilterBar
          start={start} setStart={setStart}
          end={end} setEnd={setEnd}
          onSearch={doFetch}
        />

        {/* 1b. Live Mode bar */}
        <div style={{
          background: 'var(--bg1)', border: `1px solid ${isPolling ? 'var(--green)' : 'var(--border)'}`,
          borderRadius: 12, padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          transition: 'border-color 0.3s',
        }}>
          {/* Pulse dot */}
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isPolling ? 'var(--green)' : 'var(--text-3)',
            boxShadow: isPolling ? '0 0 0 3px rgba(63,185,80,0.25)' : 'none',
            flexShrink: 0,
            animation: isPolling ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
          }} />

          <span style={{ fontSize: 12, fontWeight: 600, color: isPolling ? 'var(--green)' : 'var(--text-2)', minWidth: 80 }}>
            {isPolling ? '⚡ Live Mode' : 'Static Mode'}
          </span>

          {/* Toggle */}
          <button
            onClick={() => {
              const next = !liveMode
              setLiveMode(next)
              if (!next) {
                setPollInterval(null)
              } else {
                const defaultPoll = 10_000
                setPollInterval(defaultPoll)
                // Kick off immediately with sliding 2h window
                const now  = new Date()
                const past = new Date(now - 2 * 3600 * 1000)
                const s = toLocalDT(past), e = toLocalDT(now)
                setStart(s); setEnd(e)
                fetch(comp, s, e)
              }
            }}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none',
              background: liveMode ? 'var(--green)' : 'var(--bg2)',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              outline: '1px solid var(--border)',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: liveMode ? 22 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: liveMode ? '#fff' : 'var(--text-3)',
              transition: 'left 0.2s', display: 'block',
            }} />
          </button>

          {/* Poll interval selector */}
          {liveMode && (
            <>
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4 }}>Refresh ทุก</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {POLL_OPTIONS.filter(o => o.value !== null).map(o => (
                  <button key={o.value}
                    onClick={() => setPollInterval(o.value)}
                    style={{
                      padding: '4px 10px', fontSize: 11, fontWeight: 500,
                      background: pollInterval === o.value ? 'var(--green-dim, rgba(63,185,80,0.15))' : 'var(--bg2)',
                      border: `1px solid ${pollInterval === o.value ? 'var(--green)' : 'var(--border)'}`,
                      borderRadius: 8,
                      color: pollInterval === o.value ? 'var(--green)' : 'var(--text-2)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >{o.label}</button>
                ))}
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 'auto', fontStyle: 'italic' }}>
                ข้อมูลจะอัปเดตอัตโนมัติ • ช่วงเวลาจะเลื่อนตาม now
              </span>
            </>
          )}
        </div>
 
        {/* 2. KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          <KPICard label="P_comp"       value={latest?.power_kw}          unit="kW"          accent="var(--cyan)"   />
          <KPICard label="COP"          value={latest?.cop}               unit="—"           accent="var(--green)"  warn={warns.cop} />
          <KPICard label="Q_e"          value={latest?.q_e_kw}            unit="kW"          accent="var(--amber)"  />
          <KPICard label="Superheat"    value={latest?.superheat_suc}     unit="K"           accent="var(--red)"    warn={warns.sh} />
          <KPICard label="Subcooling"   value={latest?.subcooling}        unit="K"           accent="var(--purple)" warn={warns.sc} />
          <KPICard label="Press. Ratio" value={latest?.pressure_ratio}    unit="ratio"       accent="var(--orange)" warn={warns.pr} />
        </div>
 
        {/* 3. COP Trend + P-H Diagram */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 14 }}>
          <div className="panel" style={{ minWidth: 0 }} ref={copPanelRef}>
            <div className="panel-header">
              <span className="panel-title">COP Trend</span>
              <div style={{ display: 'flex', gap: 12 }}>
                {[['Actual','var(--green)'],['System','var(--amber)'],['Cycle','var(--pink)']].map(([l,c]) => (
                  <span key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'var(--text-2)', fontFamily:'monospace' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }}/>
                    {l}
                  </span>
                ))}
              </div>
            </div>
            {rows.length === 0 ? (
              <div style={{
                height: 220, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'var(--bg2)', borderRadius: 8,
              }}>
                <span style={{ fontSize: 22, opacity: 0.4 }}>📭</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
                  ไม่พบข้อมูลในช่วงเวลาที่คุณเลือก
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  ลองเปลี่ยนช่วงวันที่หรือเลือก compressor อื่น
                </span>
              </div>
            ) : (
              <div className="cop-scroll" style={{ maxWidth: "100%" }} ref={copScrollRef}>
                <div style={{ position: 'relative', height: 220, width: Math.max(rows.length * 30, copPanelW || 1) }}>
                  <Line
                    key={`${rows.length}-${copPanelW}`}
                    data={{
                      labels,
                      datasets: [
                        mkDs('COP', diags.map(d => num(d.cop)), '#3fb950'),
                      ],
                    }}
                    width={Math.max(rows.length * 30, copPanelW || 1)}
                    height={220}
                    options={{
                      ...CHART_DEFAULTS,
                      responsive: false,
                      onClick: (_, els) => els.length && showRecord(els[0].index),
                      onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default' },
                      plugins: {
                        ...CHART_DEFAULTS.plugins,
                        tooltip: {
                          ...CHART_DEFAULTS.plugins.tooltip,
                          mode: 'point',
                          intersect: true,
                          callbacks: {
                            footer: () => 'คลิกเพื่อดู Report ณ เวลานี้'
                          }
                        },
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
              <span style={{ fontSize: 9, color: 'var(--text-3)', fontStyle: 'italic' }}>
                {phData ? 'Live data' : 'Loading…'}
              </span>
            </div>
            <div style={{ flex: 1, position: 'relative', minHeight: 180 }}>
              {phChartData && (
                <Scatter
                  data={phChartData}
                  options={{
                    responsive: true, maintainAspectRatio: false, animation: false,
                    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1c2333', borderColor: '#30363d', borderWidth: 1, bodyColor: '#e6edf3' } },
                    scales: {
                      x: { type: 'linear', min: phXRange.min, max: phXRange.max, title: { display: true, text: 'h (kJ/kg)', color: '#8b949e', font: { size: 9 } }, ticks: { color: '#8b949e', maxTicksLimit: 5 }, grid: { color: 'rgba(48,54,61,0.4)' } },
                      y: { type: 'logarithmic', min: 0.08, max: 7, title: { display: true, text: 'P (MPa)', color: '#8b949e', font: { size: 9 } }, ticks: { color: '#8b949e', callback: v => v < 1 ? v.toFixed(2) : v.toFixed(1) }, grid: { color: 'rgba(48,54,61,0.4)' } },
                    },
                  }}
                />
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
                    <span style={{ width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>
                    {l}
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
                    <span style={{ width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>
                    {l}
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
                    <span style={{ width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>
                    {l}
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
                    <span style={{ width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>
                    {l}
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
                    📍 {formatThaiTime(selectedTs)}
                  </span>
                )}
                {selectedDiag && (
                  <button
                    onClick={() => { setSelectedDiag(null); setSelectedTs(null) }}
                    style={{ fontSize: 10, fontWeight: 600, padding: '2px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.target.style.borderColor = 'var(--border-hi)'; e.target.style.color = 'var(--text-1)' }}
                    onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-2)' }}
                  >
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
                    📍 {formatThaiTime(selectedTs)}
                  </span>
                )}
                {selectedDiag && (
                  <button
                    onClick={() => { setSelectedDiag(null); setSelectedTs(null) }}
                    style={{ fontSize: 10, fontWeight: 600, padding: '2px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.target.style.borderColor = 'var(--border-hi)'; e.target.style.color = 'var(--text-1)' }}
                    onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-2)' }}
                  >
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
    </div>
  )
}