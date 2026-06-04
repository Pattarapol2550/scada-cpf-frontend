import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from '../components/layout/Navbar'
import KPICard from '../components/dashboard/KPICard'
import AlarmLog from '../components/dashboard/AlarmLog'
import DiagnosisReport from '../components/dashboard/DiagnosisReport'
import { useMetrics } from '../hooks/useMetrics'
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
    hour: '2-digit', minute: '2-digit',
  })
}

function num(v) { return isNaN(Number(v)) ? null : Number(v) }

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  elements: { point: { radius: 0, hoverRadius: 6 } },
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index', intersect: false,
      backgroundColor: '#1c2333',
      borderColor: '#30363d', borderWidth: 1,
      titleColor: '#8b949e', bodyColor: '#e6edf3', padding: 10,
    },
  },
  scales: {
    x: { ticks: { maxTicksLimit: 8, maxRotation: 0, color: '#4d5562' }, grid: { color: 'rgba(48,54,61,0.5)' } },
    y: { ticks: { color: '#4d5562' }, grid: { color: 'rgba(48,54,61,0.5)' } },
  },
}

function mkDs(label, data, color, fill = false) {
  return {
    label, data,
    borderColor: color,
    backgroundColor: fill ? color.replace(')', ',0.08)').replace('rgb', 'rgba') : 'transparent',
    borderWidth: 1.5, tension: 0.35, spanGaps: true, fill,
    pointHoverRadius: 7,
    pointHoverBackgroundColor: color,
    pointHoverBorderColor: '#161b22',
    pointHoverBorderWidth: 2,
  }
}

// ── FilterBar ────────────────────────────────────────────
function FilterBar({ comp, setComp, start, setStart, end, setEnd, onSearch, onClear }) {
  const [activeShortcut, setActiveShortcut] = useState(null)

  const setRange = (days) => {
    const now = new Date(), past = new Date(now - days * 86400000)
    setStart(toLocalDT(past))
    setEnd(toLocalDT(now))
    setActiveShortcut(days)
    onSearch()
  }

  return (
    <div style={{
      background: 'var(--bg1)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 16px',
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
      transition: 'background 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Compressor</span>
        <select
          value={comp}
          onChange={e => { setComp(e.target.value); onSearch() }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', padding: '6px 10px', fontSize: 12, outline: 'none' }}
        >
          {COMPRESSORS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

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
        {[1, 3, 7].map(d => (
          <button key={d}
            onClick={() => setRange(d)}
            style={{
              padding: '6px 10px', fontSize: 11, fontWeight: 500,
              background: activeShortcut === d ? 'var(--blue-dim)' : 'var(--bg2)',
              border: `1px solid ${activeShortcut === d ? 'var(--blue)' : 'var(--border)'}`,
              borderRadius: 8,
              color: activeShortcut === d ? 'var(--blue)' : 'var(--text-2)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >{d}D</button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-ghost" onClick={() => { setStart(''); setEnd(''); setActiveShortcut(null); onClear() }}>Reset</button>
        <button className="btn-primary" onClick={onSearch}>🔍 Search</button>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────
export default function DashboardPage() {
  const [comp, setComp]     = useState('COMP-01')
  const [start, setStart]   = useState('')
  const [end, setEnd]       = useState('')
  const [connStatus, setConnStatus] = useState('connecting')
  const [selectedDiag, setSelectedDiag] = useState(null)
  const [selectedTs,   setSelectedTs]   = useState(null)
  const [phData, setPhData] = useState(null)
  const reportRef = useRef(null)

  const { records, loading, error, fetch } = useMetrics()

  const doFetch = useCallback(() => {
    fetch(comp, start, end)
  }, [comp, start, end, fetch])

  useEffect(() => { doFetch() }, [])

  useEffect(() => {
    if (loading)      setConnStatus('connecting')
    else if (error)   setConnStatus('error')
    else              setConnStatus('live')
  }, [loading, error])

  // Fetch P-H diagram for latest record
  useEffect(() => {
    if (!records.length) return
    getPHDiagram(comp).then(r => setPhData(r.data)).catch(() => {})
  }, [records, comp])

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
    setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  // KPI warns
  const warns = {
    cop:    latest?.actual_cop < 1.5 ? 'Low Efficiency' : '',
    sh:     latest?.superheat_suc < 0 ? 'Floodback Risk' : latest?.superheat_suc > 15 ? 'High Superheat' : '',
    sc:     latest?.subcooling < 2 ? 'Low Subcooling' : latest?.subcooling > 15 ? 'High Subcooling' : '',
    pr:     latest?.pressure_ratio > 10 ? 'High Ratio' : '',
  }

  // ── P-H chart data ───────────────────────────────────
  const phChartData = phData ? {
    datasets: [
      {
        label: 'Saturation liquid',
        data: phData.saturation_dome.liquid.map(p => ({ x: p.h, y: p.p })),
        borderColor: '#39c5cf', backgroundColor: 'rgba(57,197,207,0.06)',
        borderWidth: 1.5, showLine: true, tension: 0.4, pointRadius: 0, fill: true,
      },
      {
        label: 'Saturation vapour',
        data: phData.saturation_dome.vapour.map(p => ({ x: p.h, y: p.p })),
        borderColor: '#39c5cf', backgroundColor: 'transparent',
        borderWidth: 1.5, showLine: true, tension: 0.4, pointRadius: 0,
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

      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* 1. Filter bar */}
        <FilterBar
          comp={comp} setComp={setComp}
          start={start} setStart={setStart}
          end={end} setEnd={setEnd}
          onSearch={doFetch} onClear={doFetch}
        />

        {/* 2. KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          <KPICard label="Actual COP"   value={latest?.actual_cop}        unit="coefficient" accent="var(--green)"  warn={warns.cop} />
          <KPICard label="System COP"   value={latest?.system_cop}        unit="coefficient" accent="var(--amber)"  />
          <KPICard label="Cooling Cap." value={latest?.calculated_ql_kw}  unit="kW"          accent="var(--cyan)"   />
          <KPICard label="Superheat"    value={latest?.superheat_suc}     unit="°C"          accent="var(--red)"    warn={warns.sh} />
          <KPICard label="Subcooling"   value={latest?.subcooling}        unit="°C"          accent="var(--purple)" warn={warns.sc} />
          <KPICard label="Press. Ratio" value={latest?.pressure_ratio}    unit="ratio"       accent="var(--orange)" warn={warns.pr} />
        </div>

        {/* 3. COP Trend + P-H Diagram */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14 }}>
          <div className="panel">
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
            <div style={{ overflowX: 'auto' }}>
              <div style={{ position: 'relative', height: 220, width: Math.max(rows.length * 42, 700) }}>
                <Line
                  data={{
                    labels,
                    datasets: [
                      mkDs('Actual COP', diags.map(d => num(d.actual_cop)), '#3fb950', true),
                      mkDs('System COP', diags.map(d => num(d.system_cop)), '#d29922'),
                      mkDs('Cycle COP',  diags.map(d => num(d.cycle_cop)),  '#ec6cb9'),
                    ],
                  }}
                  options={{
                    ...CHART_DEFAULTS,
                    onClick: (_, els) => els.length && showRecord(els[0].index),
                    onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default' },
                    plugins: { ...CHART_DEFAULTS.plugins, tooltip: { ...CHART_DEFAULTS.plugins.tooltip, callbacks: { footer: () => 'คลิกเพื่อดู Report ณ เวลานี้' } } },
                  }}
                />
              </div>
            </div>
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
                      x: { type: 'linear', min: 150, max: 1800, title: { display: true, text: 'h (kJ/kg)', color: '#4d5562', font: { size: 9 } }, ticks: { color: '#4d5562', maxTicksLimit: 5 }, grid: { color: 'rgba(48,54,61,0.4)' } },
                      y: { type: 'logarithmic', min: 0.08, max: 7, title: { display: true, text: 'P (MPa)', color: '#4d5562', font: { size: 9 } }, ticks: { color: '#4d5562', callback: v => v < 1 ? v.toFixed(2) : v.toFixed(1) }, grid: { color: 'rgba(48,54,61,0.4)' } },
                    },
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* 4. Secondary charts 2×2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Pressure */}
          <div className="panel">
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
            <div style={{ position: 'relative', height: 160 }}>
              <Line data={{ labels, datasets: [mkDs('SP', inputs.map(i => num(i.sp_kg)), '#39c5cf'), mkDs('DP', inputs.map(i => num(i.dp_kg)), '#f85149')] }}
                options={{ ...CHART_DEFAULTS, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: 'kg/cm²', color: '#4d5562', font: { size: 9 } } } } }} />
            </div>
          </div>

          {/* Temperature */}
          <div className="panel">
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
            <div style={{ position: 'relative', height: 160 }}>
              <Line data={{ labels, datasets: [mkDs('ST', inputs.map(i => num(i.st_c)), '#39c5cf'), mkDs('DT', inputs.map(i => num(i.dt_c)), '#f85149'), mkDs('Liquid', inputs.map(i => num(i.liquid_temp_c)), '#a371f7')] }}
                options={{ ...CHART_DEFAULTS, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: '°C', color: '#4d5562', font: { size: 9 } } } } }} />
            </div>
          </div>

          {/* Superheat / Subcooling */}
          <div className="panel">
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
            <div style={{ position: 'relative', height: 160 }}>
              <Line data={{ labels, datasets: [mkDs('Superheat', diags.map(d => num(d.superheat_suc)), '#f85149'), mkDs('Subcooling', diags.map(d => num(d.subcooling)), '#a371f7')] }}
                options={{ ...CHART_DEFAULTS, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: '°C', color: '#4d5562', font: { size: 9 } } } } }} />
            </div>
          </div>

          {/* Power & Capacity */}
          <div className="panel">
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
            <div style={{ position: 'relative', height: 160 }}>
              <Line data={{ labels, datasets: [mkDs('Power kW', diags.map(d => num(d.power_kw)), '#f0883e'), mkDs('Q_L kW', diags.map(d => num(d.calculated_ql_kw)), '#39c5cf')] }}
                options={{ ...CHART_DEFAULTS, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: 'kW', color: '#4d5562', font: { size: 9 } } } } }} />
            </div>
          </div>
        </div>

        {/* 5. Analysis report + Alarm history */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} ref={reportRef}>
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Analysis Report</span>
              {selectedTs && (
                <span style={{ fontSize: 10, color: 'var(--blue)', background: 'var(--blue-dim)', border: '1px solid rgba(88,166,255,0.2)', padding: '2px 8px', borderRadius: 20, fontFamily: 'monospace' }}>
                  📍 {formatThaiTime(selectedTs)}
                </span>
              )}
            </div>
            <DiagnosisReport diag={selectedDiag ?? latest} />
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Alarm History</span>
              {selectedTs && (
                <span style={{ fontSize: 10, color: 'var(--blue)', background: 'var(--blue-dim)', border: '1px solid rgba(88,166,255,0.2)', padding: '2px 8px', borderRadius: 20, fontFamily: 'monospace' }}>
                  📍 {formatThaiTime(selectedTs)}
                </span>
              )}
            </div>
            <AlarmLog records={selectedDiag ? [{ diagnosis: selectedDiag, timestamp: selectedTs }] : records} singleRecord={!!selectedDiag} />
          </div>
        </div>

      </div>
    </div>
  )
}
