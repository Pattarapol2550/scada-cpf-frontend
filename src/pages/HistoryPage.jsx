import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import { useMetrics } from '../hooks/useMetrics'
import { COMPRESSORS, toLocalDT, formatThaiTime, num } from '../utils/format'
import { exportCSV, exportXLSX } from '../utils/exportUtils'
import { CHART_DEFAULTS, CHART_TOOLTIP, mkDs } from '../utils/chartConfig'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const ROWS_PER_PAGE        = 50
const AUTO_REFRESH_SECONDS = 30

const CHART_OPT = {
  ...CHART_DEFAULTS,
  elements: { point: { radius: 2 } },
  plugins: {
    ...CHART_DEFAULTS.plugins,
    tooltip: { ...CHART_TOOLTIP, mode: 'index', intersect: false, padding: 8 },
  },
  scales: {
    x: { ticks: { maxTicksLimit: 10, maxRotation: 0, color: '#4d5562', font: { size: 9 } }, grid: { color: 'rgba(48,54,61,0.4)' } },
    y: { ticks: { color: '#4d5562', font: { size: 9 } }, grid: { color: 'rgba(48,54,61,0.4)' } },
  },
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }

  const btn = (content, target, disabled = false) => (
    <button key={content} onClick={() => !disabled && typeof target === 'number' && onPage(target)} disabled={disabled} style={{
      minWidth: 32, height: 30, padding: '0 8px', borderRadius: 6, border: '1px solid',
      fontSize: 11, fontWeight: 500, cursor: disabled ? 'default' : 'pointer', transition: 'all 0.15s',
      borderColor: content === page ? 'var(--blue)' : 'var(--border)',
      background:  content === page ? 'var(--blue-dim)' : 'var(--bg2)',
      color:       content === page ? 'var(--blue)' : disabled ? 'var(--text-3)' : 'var(--text-2)',
    }}>{content}</button>
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
        <select value={page} onChange={e => onPage(Number(e.target.value))} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-1)', padding: '4px 8px', fontSize: 11, outline: 'none', cursor: 'pointer' }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const location = useLocation()
  const [comp, setComp]         = useState('COMP-01')
  const [liveMode, setLiveMode] = useState(true)
  const [start, setStart]       = useState(() => toLocalDT(new Date(Date.now() - 2 * 3600000)))
  const [end, setEnd]           = useState(() => toLocalDT(new Date()))
  const [page, setPage]         = useState(1)
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [countdown, setCountdown]         = useState(AUTO_REFRESH_SECONDS)

  const chartScrollRef = useRef(null)
  const chartPanelRef  = useRef(null)
  const [chartPanelW, setChartPanelW] = useState(0)
  const timerRef     = useRef(null)
  const countdownRef = useRef(null)

  const { records, loading, error, fetch } = useMetrics({ limit: 2000 })

  // Always-fresh ref so interval timers don't capture stale callbacks
  const doLiveRefreshRef = useRef(null)

  const doFetch = (s, e) => {
    setPage(1)
    fetch(comp, s, e)
    requestAnimationFrame(() => {
      if (chartScrollRef.current) chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth
    })
  }

  const doLiveRefresh = () => {
    const newEnd   = new Date()
    const newStart = new Date(newEnd.getTime() - 2 * 3600000)
    const s = toLocalDT(newStart), e = toLocalDT(newEnd)
    setEnd(e); setStart(s)
    doFetch(s, e)
    setCountdown(AUTO_REFRESH_SECONDS)
  }

  // Keep ref pointing at the latest version so the interval always calls current comp
  doLiveRefreshRef.current = doLiveRefresh

  // Update lastRefreshed when data actually arrives
  useEffect(() => {
    if (records.length) setLastRefreshed(new Date())
  }, [records])

  useEffect(() => {
    if (!liveMode) { clearInterval(timerRef.current); clearInterval(countdownRef.current); return }
    countdownRef.current = setInterval(() => setCountdown(c => c <= 1 ? AUTO_REFRESH_SECONDS : c - 1), 1000)
    timerRef.current     = setInterval(() => doLiveRefreshRef.current(), AUTO_REFRESH_SECONDS * 1000)
    return () => { clearInterval(timerRef.current); clearInterval(countdownRef.current) }
  }, [liveMode])

  useEffect(() => { doLiveRefresh() }, []) // eslint-disable-line
  useEffect(() => { if (liveMode) doLiveRefresh() }, [comp]) // eslint-disable-line

  // เมื่อ navigate มาจาก ManualInputPage ให้ switch comp + refresh ทันที
  useEffect(() => {
    const fromInput = location.state?.fromInput
    if (fromInput && COMPRESSORS.includes(fromInput)) {
      setComp(fromInput)
    }
  }, [location.state]) // eslint-disable-line

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        if (e.target === chartPanelRef.current) setChartPanelW(e.contentRect.width)
      }
    })
    if (chartPanelRef.current) obs.observe(chartPanelRef.current)
    return () => obs.disconnect()
    // chartPanelRef is always mounted (not conditional), so [] is correct here
  }, [])

  // Memoized — prevents re-deriving 2000-record arrays on every 1s countdown tick
  const rows       = useMemo(() => [...records].reverse(), [records])
  const labels     = useMemo(() => rows.map(r => formatThaiTime(r.timestamp)), [rows])
  const diags      = useMemo(() => rows.map(r => r.diagnosis || {}), [rows])
  const totalPages = useMemo(() => Math.max(1, Math.ceil(records.length / ROWS_PER_PAGE)), [records])
  const pageRows   = useMemo(() => records.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE), [records, page])
  const fileBase   = `history_${comp}_${start.replace('T', '_').slice(0, 16)}`

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg0)' }}>
      <Sidebar />

      <div style={{ flex: 1, minWidth: 0, padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Filter bar */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Compressor</span>
            <select value={comp} onChange={e => setComp(e.target.value)}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', padding: '6px 10px', fontSize: 12, outline: 'none' }}>
              {COMPRESSORS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <button onClick={() => { const next = !liveMode; setLiveMode(next); if (next) doLiveRefresh() }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: '1px solid', cursor: 'pointer', transition: 'all 0.2s', background: liveMode ? 'var(--green-dim)' : 'var(--bg2)', borderColor: liveMode ? 'var(--green)' : 'var(--border)', color: liveMode ? 'var(--green)' : 'var(--text-2)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: liveMode ? 'var(--green)' : 'var(--text-3)', display: 'inline-block', boxShadow: liveMode ? '0 0 6px var(--green)' : 'none', animation: liveMode ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
            Live
          </button>

          {[['เริ่ม', start, setStart], ['สิ้นสุด', end, setEnd]].map(([label, val, set]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</span>
              <input type="datetime-local" value={val} onChange={e => { set(e.target.value); setLiveMode(false) }}
                style={{ background: liveMode ? 'rgba(255,255,255,0.03)' : 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: liveMode ? 'var(--text-3)' : 'var(--text-1)', padding: '6px 10px', fontSize: 12, outline: 'none', opacity: liveMode ? 0.6 : 1 }} />
            </div>
          ))}

          <div style={{ flex: 1 }} />

          {liveMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {lastRefreshed && (
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                  อัพเดท {lastRefreshed.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>refresh ใน {countdown}s</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            {liveMode ? (
              <button className="btn-ghost" onClick={doLiveRefresh} disabled={loading} style={{ fontSize: 11, padding: '5px 12px' }}>↻ Refresh Now</button>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => { setLiveMode(true); doLiveRefresh() }}>Reset</button>
                <button className="btn-primary" onClick={() => doFetch(start, end)}>🔍 Search</button>
              </>
            )}
          </div>
        </div>

        {/* COP Trend */}
        <div className="panel" ref={chartPanelRef}>
          <div className="panel-header"><span className="panel-title">COP Trend</span></div>
          {loading ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 12 }}>กำลังโหลด…</div>
          ) : rows.length === 0 ? (
            <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--bg2)', borderRadius: 8 }}>
              <span style={{ fontSize: 20, opacity: .4 }}>📭</span>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>ไม่พบข้อมูลสำหรับแสดงกราฟ</span>
            </div>
          ) : (
            <div className="cop-scroll" ref={chartScrollRef}>
              <div style={{ position: 'relative', height: 180, width: Math.max(rows.length * 20, chartPanelW || 1) }}>
                <Line key={`${rows.length}-${chartPanelW}`} width={Math.max(rows.length * 20, chartPanelW || 1)} height={180}
                  data={{ labels, datasets: [mkDs('COP', diags.map(d => num(d.cop)), '#3fb950')] }}
                  options={{ ...CHART_OPT, responsive: false }} />
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="panel-title">ข้อมูลย้อนหลัง</span>
              {records.length > 0 && <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>{records.length.toLocaleString()} records</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => exportCSV(records, `${fileBase}.csv`)} disabled={!records.length} className="btn-ghost" style={{ fontSize: 11, padding: '4px 12px', opacity: records.length ? 1 : 0.4 }}>⬇ CSV</button>
              <button onClick={() => exportXLSX(records, `${fileBase}.xlsx`, 'History')} disabled={!records.length} className="btn-ghost" style={{ fontSize: 11, padding: '4px 12px', opacity: records.length ? 1 : 0.4 }}>⬇ Excel</button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>กำลังโหลด…</div>
          ) : error ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--red)', fontSize: 12 }}>โหลดข้อมูลไม่สำเร็จ</div>
          ) : records.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>ไม่พบข้อมูลในช่วงเวลาที่เลือก</div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['Timestamp', 'SP kg/cm²', 'DP kg/cm²', 'ST °C', 'DT °C', 'Liquid °C', 'Current A', 'COP', 'P_comp kW', 'Q_e kW', 'Superheat K', 'Subcooling K', 'Press. Ratio', 'Mass Flow kg/h', 'Alarms'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px 8px', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((rec, i) => {
                      const d      = rec.diagnosis      || {}
                      const inp    = rec.inputs_snapshot || {}
                      const alarms = d.alarms || []
                      const hasCrit = alarms.some(a => a.severity === 'Critical')
                      const cell = (v, hi) => <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: hi ? 'var(--text-1)' : 'var(--text-2)', whiteSpace: 'nowrap' }}>{v ?? '--'}</td>
                      return (
                        <tr key={rec._id || i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 10, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{formatThaiTime(rec.timestamp)}</td>
                          {cell(inp.sp_kg)}{cell(inp.dp_kg)}{cell(inp.st_c)}{cell(inp.dt_c)}
                          {cell(inp.liquid_temp_c)}{cell(inp.current_amp)}
                          {cell(d.cop, true)}{cell(d.power_kw, true)}{cell(d.q_e_kw, true)}
                          {cell(d.superheat_suc, true)}{cell(d.subcooling, true)}
                          {cell(d.pressure_ratio, true)}{cell(d.m_dot_kgh)}
                          <td style={{ padding: '6px 10px' }}>
                            {alarms.length === 0 ? (
                              <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 20, background: 'var(--green-dim)', color: 'var(--green)', fontWeight: 600 }}>Normal</span>
                            ) : (
                              <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 20, background: hasCrit ? 'var(--red-dim)' : 'var(--amber-dim)', color: hasCrit ? 'var(--red)' : 'var(--amber)', fontWeight: 600 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                  แสดง {((page - 1) * ROWS_PER_PAGE) + 1}–{Math.min(page * ROWS_PER_PAGE, records.length)} จาก {records.length.toLocaleString()} records
                </span>
                <Pagination page={page} totalPages={totalPages} onPage={setPage} />
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}`}</style>
    </div>
  )
}
