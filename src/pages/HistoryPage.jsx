import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from '../components/layout/Navbar'
import { getMetrics } from '../services/api'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import * as XLSX from 'xlsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const COMPRESSORS = ['COMP-01','COMP-02','COMP-03','COMP-04','COMP-05','COMP-06','COMP-07']
const ROWS_PER_PAGE = 50
const AUTO_REFRESH_SECONDS = 120 // auto-refresh ทุก 2 นาที

function toLocalDT(date) {
  const p = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

function formatThaiTime(str) {
  if (!str) return '--'
  return new Date(str).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', hour12: false,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function num(v) { return isNaN(Number(v)) ? null : Number(v) }

function mkDs(label, data, color) {
  return {
    label, data, borderColor: color,
    backgroundColor: 'transparent',
    borderWidth: 1.5, tension: 0, spanGaps: true, fill: false,
    pointRadius: 2, pointBackgroundColor: color,
    pointHoverRadius: 5, pointHoverBackgroundColor: color,
  }
}

const CHART_OPT = {
  responsive: true, maintainAspectRatio: false, animation: false,
  elements: { point: { radius: 2 } },
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index', intersect: false,
      backgroundColor: '#1c2333', borderColor: '#30363d', borderWidth: 1,
      titleColor: '#8b949e', bodyColor: '#e6edf3', padding: 8,
    },
  },
  scales: {
    x: { ticks: { maxTicksLimit: 10, maxRotation: 0, color: '#4d5562', font: { size: 9 } }, grid: { color: 'rgba(48,54,61,0.4)' } },
    y: { ticks: { color: '#4d5562', font: { size: 9 } }, grid: { color: 'rgba(48,54,61,0.4)' } },
  },
}

// ── Pagination ────────────────────────────────────────────
function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null

  const pages = []
  const delta = 2

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  const btn = (content, target, disabled = false) => (
    <button
      key={content}
      onClick={() => !disabled && typeof target === 'number' && onPage(target)}
      disabled={disabled}
      style={{
        minWidth: 32, height: 30, padding: '0 8px',
        borderRadius: 6, border: '1px solid',
        fontSize: 11, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.15s',
        borderColor: content === page ? 'var(--blue)' : 'var(--border)',
        background: content === page ? 'var(--blue-dim)' : 'var(--bg2)',
        color: content === page ? 'var(--blue)' : disabled ? 'var(--text-3)' : 'var(--text-2)',
      }}
    >{content}</button>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {btn('←', page - 1, page === 1)}
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`dots-${i}`} style={{ fontSize: 11, color: 'var(--text-3)', padding: '0 4px' }}>…</span>
          : btn(p, p)
      )}
      {btn('→', page + 1, page === totalPages)}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>ไปหน้า</span>
        <select
          value={page}
          onChange={e => onPage(Number(e.target.value))}
          style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--text-1)', padding: '4px 8px',
            fontSize: 11, outline: 'none', cursor: 'pointer',
          }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────
export default function HistoryPage() {
  const [comp, setComp]     = useState('COMP-01')

  // "live" mode = end ติด "ตอนนี้" เสมอ, start = now - 2h
  const [liveMode, setLiveMode] = useState(true)
  const [start, setStart]   = useState(() => toLocalDT(new Date(Date.now() - 2 * 3600000)))
  const [end, setEnd]       = useState(() => toLocalDT(new Date()))

  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [page, setPage]     = useState(1)
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS)

  const chartScrollRef = useRef(null)
  const chartPanelRef  = useRef(null)
  const [chartPanelW, setChartPanelW] = useState(0)
  const timerRef = useRef(null)
  const countdownRef = useRef(null)

  // ── Fetch ────────────────────────────────────────────────
  const doFetch = useCallback(async (s, e) => {
    setLoading(true); setError(null); setPage(1)
    try {
      const params = { limit: 2000 }
      if (s) params.start = new Date(s).toISOString()
      if (e) params.end   = new Date(e).toISOString()
      const res = await getMetrics(comp, params)
      setRecords(res.data)
      setLastRefreshed(new Date())
      requestAnimationFrame(() => {
        if (chartScrollRef.current)
          chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth
      })
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [comp])

  // Live refresh: อัพเดท end = now แล้ว fetch
  const doLiveRefresh = useCallback(() => {
    const newEnd = new Date()
    const newStart = new Date(newEnd.getTime() - 2 * 3600000)
    setEnd(toLocalDT(newEnd))
    setStart(toLocalDT(newStart))
    doFetch(toLocalDT(newStart), toLocalDT(newEnd))
    setCountdown(AUTO_REFRESH_SECONDS)
  }, [doFetch])

  // ── Auto-refresh interval ────────────────────────────────
  useEffect(() => {
    if (!liveMode) {
      clearInterval(timerRef.current)
      clearInterval(countdownRef.current)
      return
    }

    // เริ่ม countdown tick ทุก 1 วิ
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) return AUTO_REFRESH_SECONDS
        return c - 1
      })
    }, 1000)

    // auto-refresh ทุก AUTO_REFRESH_SECONDS
    timerRef.current = setInterval(() => {
      doLiveRefresh()
    }, AUTO_REFRESH_SECONDS * 1000)

    return () => {
      clearInterval(timerRef.current)
      clearInterval(countdownRef.current)
    }
  }, [liveMode, doLiveRefresh])

  // โหลดครั้งแรกทันที
  useEffect(() => {
    doLiveRefresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // เมื่อเปลี่ยน comp ใน live mode ให้ refresh ทันที
  useEffect(() => {
    if (liveMode) doLiveRefresh()
  }, [comp]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        if (e.target === chartPanelRef.current) setChartPanelW(e.contentRect.width)
      }
    })
    if (chartPanelRef.current) obs.observe(chartPanelRef.current)
    return () => obs.disconnect()
  }, [])

  // ── Derived ─────────────────────────────────────────────
  const rows     = [...records].reverse()
  const labels   = rows.map(r => formatThaiTime(r.timestamp))
  const diags    = rows.map(r => r.diagnosis || {})
  const totalPages = Math.max(1, Math.ceil(records.length / ROWS_PER_PAGE))
  const pageRows = records.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  // ── Export helpers ────────────────────────────────────
  const flattenRecord = r => ({
    Timestamp:          formatThaiTime(r.timestamp),
    Compressor:         r.compressor_id,
    // ── Inputs ──────────────────────────────────────────
    'SP (kg/cm²)':      r.inputs_snapshot?.sp_kg        ?? '--',
    'DP (kg/cm²)':      r.inputs_snapshot?.dp_kg        ?? '--',
    'ST (°C)':          r.inputs_snapshot?.st_c         ?? '--',
    'DT (°C)':          r.inputs_snapshot?.dt_c         ?? '--',
    'Liquid Temp (°C)': r.inputs_snapshot?.liquid_temp_c ?? '--',
    'Current (A)':      r.inputs_snapshot?.current_amp  ?? '--',
    // ── Diagnosis ────────────────────────────────────────
    'COP':              r.diagnosis?.cop            ?? '--',
    'P_comp (kW)':      r.diagnosis?.power_kw       ?? '--',
    'Q_e (kW)':         r.diagnosis?.q_e_kw         ?? '--',
    'Superheat (K)':    r.diagnosis?.superheat_suc  ?? '--',
    'Subcooling (K)':   r.diagnosis?.subcooling      ?? '--',
    'Press. Ratio':     r.diagnosis?.pressure_ratio  ?? '--',
    'Mass Flow (kg/h)': r.diagnosis?.m_dot_kgh       ?? '--',
    Alarms:             (r.diagnosis?.alarms || []).map(a => a.title).join('; '),
  })

  const exportCSV = () => {
    const data = records.map(flattenRecord)
    const header = Object.keys(data[0]).join(',')
    const body   = data.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n')
    const blob   = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a'); a.href = url
    a.download = `history_${comp}_${start.replace('T','_').slice(0,16)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const exportXLSX = () => {
    const data = records.map(flattenRecord)
    const ws   = XLSX.utils.json_to_sheet(data)
    const wb   = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'History')
    XLSX.writeFile(wb, `history_${comp}_${start.replace('T','_').slice(0,16)}.xlsx`)
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)' }}>
      <Navbar />

      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Filter bar */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Compressor</span>
            <select value={comp} onChange={e => setComp(e.target.value)}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', padding: '6px 10px', fontSize: 12, outline: 'none' }}>
              {COMPRESSORS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Live mode toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => {
                const next = !liveMode
                setLiveMode(next)
                if (next) doLiveRefresh()
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
                background: liveMode ? 'var(--green-dim)' : 'var(--bg2)',
                borderColor: liveMode ? 'var(--green)' : 'var(--border)',
                color: liveMode ? 'var(--green)' : 'var(--text-2)',
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: liveMode ? 'var(--green)' : 'var(--text-3)',
                display: 'inline-block',
                boxShadow: liveMode ? '0 0 6px var(--green)' : 'none',
                animation: liveMode ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }} />
              Live
            </button>
          </div>

          {/* Date inputs — disabled ใน live mode */}
          {[['เริ่ม', start, setStart], ['สิ้นสุด', end, setEnd]].map(([label, val, set]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</span>
            <input
              type="datetime-local" value={val}
              onChange={e => { set(e.target.value); setLiveMode(false) }}
            
                style={{
                  background: liveMode ? 'rgba(255,255,255,0.03)' : 'var(--bg2)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  color: liveMode ? 'var(--text-3)' : 'var(--text-1)',
                  padding: '6px 10px', fontSize: 12, outline: 'none',
                  cursor: 'text',
                   opacity: liveMode ? 0.6 : 1, 
                }}
              />
            </div>
          ))}

          <div style={{ flex: 1 }} />

          {/* Countdown + refresh status */}
          {liveMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {lastRefreshed && (
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                  อัพเดท {lastRefreshed.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                refresh ใน {countdown}s
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            {liveMode ? (
              <button className="btn-ghost" onClick={doLiveRefresh} disabled={loading}
                style={{ fontSize: 11, padding: '5px 12px' }}>
                ↻ Refresh Now
              </button>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => {
                  setLiveMode(true)
                  doLiveRefresh()
                }}>Reset</button>
                <button className="btn-primary" onClick={() => doFetch(start, end)}>🔍 Search</button>
              </>
            )}
          </div>
        </div>

        {/* COP Trend chart */}
        <div className="panel" ref={chartPanelRef}>
          <div className="panel-header">
            <span className="panel-title">COP Trend</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {[['COP','#3fb950']].map(([l,c]) => (
                <span key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'var(--text-2)', fontFamily:'monospace' }}>
                  <span style={{ width:7,height:7,borderRadius:'50%',background:c,display:'inline-block'}}/>
                  {l}
                </span>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ height: 180, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-3)', fontSize:12 }}>กำลังโหลด…</div>
          ) : rows.length === 0 ? (
            <div style={{ height: 180, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, background:'var(--bg2)', borderRadius:8 }}>
              <span style={{ fontSize:20, opacity:.4 }}>📭</span>
              <span style={{ fontSize:13, color:'var(--text-2)' }}>ไม่พบข้อมูลสำหรับแสดงกราฟ</span>
            </div>
          ) : (
            <div className="cop-scroll" ref={chartScrollRef}>
              <div style={{ position:'relative', height:180, width: Math.max(rows.length * 20, chartPanelW || 1) }}>
                <Line
                  key={`${rows.length}-${chartPanelW}`}
                  width={Math.max(rows.length * 20, chartPanelW || 1)}
                  height={180}
                  data={{ labels, datasets: [
                    mkDs('COP', diags.map(d => num(d.cop)), '#3fb950'),
                  ]}}
                  options={{ ...CHART_OPT, responsive: false }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Table + export */}
        <div className="panel">
          <div className="panel-header">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span className="panel-title">ข้อมูลย้อนหลัง</span>
              {records.length > 0 && (
                <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:'monospace' }}>
                  {records.length.toLocaleString()} records
                </span>
              )}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button
                onClick={exportCSV}
                disabled={!records.length}
                className="btn-ghost"
                style={{ fontSize:11, padding:'4px 12px', opacity: records.length ? 1 : 0.4 }}
              >⬇ CSV</button>
              <button
                onClick={exportXLSX}
                disabled={!records.length}
                className="btn-ghost"
                style={{ fontSize:11, padding:'4px 12px', opacity: records.length ? 1 : 0.4 }}
              >⬇ Excel</button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--text-3)', fontSize:12 }}>กำลังโหลด…</div>
          ) : error ? (
            <div style={{ padding:20, textAlign:'center', color:'var(--red)', fontSize:12 }}>{error}</div>
          ) : records.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--text-3)', fontSize:12 }}>ไม่พบข้อมูลในช่วงเวลาที่เลือก</div>
          ) : (
            <>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr>
                      {[
                        'Timestamp',
                        'SP kg/cm²','DP kg/cm²','ST °C','DT °C','Liquid °C','Current A',
                        'COP','P_comp kW','Q_e kW',
                        'Superheat K','Subcooling K','Press. Ratio','Mass Flow kg/h',
                        'Alarms',
                      ].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'6px 10px 8px', fontSize:9, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-3)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((rec, i) => {
                      const d = rec.diagnosis || {}
                      const inp = rec.inputs_snapshot || {}
                      const alarms = d.alarms || []
                      const hasCrit = alarms.some(a => a.severity === 'Critical')
                      const cell = (v, highlight) => (
                        <td style={{ padding:'6px 10px', fontFamily:'monospace', color: highlight ? 'var(--text-1)' : 'var(--text-2)', whiteSpace:'nowrap' }}>{v ?? '--'}</td>
                      )
                      return (
                        <tr key={rec._id || i} style={{ borderBottom:'1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace', fontSize:10, color:'var(--text-2)', whiteSpace:'nowrap' }}>{formatThaiTime(rec.timestamp)}</td>
                          {/* Inputs */}
                          {cell(inp.sp_kg)}
                          {cell(inp.dp_kg)}
                          {cell(inp.st_c)}
                          {cell(inp.dt_c)}
                          {cell(inp.liquid_temp_c)}
                          {cell(inp.current_amp)}
                          {/* Diagnosis */}
                          {cell(d.cop,           true)}
                          {cell(d.power_kw,      true)}
                          {cell(d.q_e_kw,        true)}
                          {cell(d.superheat_suc, true)}
                          {cell(d.subcooling,    true)}
                          {cell(d.pressure_ratio,true)}
                          {cell(d.m_dot_kgh)}
                          <td style={{ padding:'6px 10px' }}>
                            {alarms.length === 0 ? (
                              <span style={{ fontSize:9, padding:'1px 7px', borderRadius:20, background:'var(--green-dim)', color:'var(--green)', fontWeight:600 }}>Normal</span>
                            ) : (
                              <span style={{ fontSize:9, padding:'1px 7px', borderRadius:20, background: hasCrit ? 'var(--red-dim)' : 'var(--amber-dim)', color: hasCrit ? 'var(--red)' : 'var(--amber)', fontWeight:600 }}>
                                {hasCrit ? 'Critical' : 'Warning'} ×{alarms.length}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:14, flexWrap:'wrap', gap:8 }}>
                <span style={{ fontSize:10, color:'var(--text-3)' }}>
                  แสดง {((page-1)*ROWS_PER_PAGE)+1}–{Math.min(page*ROWS_PER_PAGE, records.length)} จาก {records.length.toLocaleString()} records
                </span>
                <Pagination page={page} totalPages={totalPages} onPage={setPage} />
              </div>
            </>
          )}
        </div>

      </div>

      {/* Pulse animation for live dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}