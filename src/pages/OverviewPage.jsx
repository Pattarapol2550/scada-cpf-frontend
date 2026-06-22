/**
 * src/pages/OverviewPage.jsx
 *
 * Fleet overview — ดูทุก compressor พร้อมกัน
 * ดึงข้อมูล 7 compressor พร้อมกัน (Promise.all)
 * แสดง: status bar, fleet KPI, compressor cards, COP chart, superheat chart, power donut, alarm table
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  Tooltip, Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import Annotation from 'chartjs-plugin-annotation'
import Navbar from '../components/layout/Navbar'
import { getMetrics } from '../services/api'
import { COMPRESSORS, formatThaiTime } from '../utils/format'
import { useNavigate } from 'react-router-dom'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Annotation)

// ── สีต่อ compressor ──────────────────────────────────────
const COMP_COLORS = ['#378add','#1d9e75','#ba7517','#534ab7','#d4537e','#854f0b','#a32d2d']

// ── Badge ─────────────────────────────────────────────────
function StatusBadge({ severity }) {
  const map = {
    Critical: { bg: 'rgba(163,45,45,0.12)', color: '#a32d2d', dot: '#a32d2d', label: 'Critical' },
    Warning:  { bg: 'rgba(133,79,11,0.12)', color: '#854f0b', dot: '#854f0b', label: 'Warning'  },
    Normal:   { bg: 'rgba(63,185,80,0.12)', color: '#27500a', dot: '#639922', label: 'Normal'   },
    '--':     { bg: 'var(--bg3)',           color: 'var(--text-3)', dot: 'var(--text-3)', label: 'No data' },
  }
  const s = map[severity] ?? map['--']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

// ── Compressor card ───────────────────────────────────────
function CompCard({ id, diag, inp, ts, onClick }) {
  const d = diag || {}
  const i = inp  || {}

  const alarms    = d.alarms || []
  const hasCrit   = alarms.some(a => a.severity === 'Critical')
  const hasWarn   = alarms.some(a => a.severity === 'Warning')
  const noData    = !ts
  const severity  = noData ? '--' : hasCrit ? 'Critical' : hasWarn ? 'Warning' : 'Normal'

  const borderColor = hasCrit
    ? 'rgba(163,45,45,0.45)'
    : hasWarn
    ? 'rgba(133,79,11,0.4)'
    : 'var(--border)'

  const val = (v, dec = 2, unit = '') => {
    if (v === null || v === undefined || v === '--') return '--'
    return `${Number(v).toFixed(dec)}${unit ? ' ' + unit : ''}`
  }

  const warnVal = (v, lo, hi) => {
    const n = Number(v)
    if (isNaN(n)) return 'var(--text-1)'
    if (n < lo || n > hi) return hasCrit ? '#a32d2d' : '#854f0b'
    return 'var(--text-1)'
  }

  return (
    <div
      onClick={() => onClick(id)}
      style={{
        background: 'var(--bg1)', border: `1px solid ${borderColor}`,
        borderRadius: 12, padding: '11px 12px', cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg1)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{id}</span>
        <StatusBadge severity={severity} />
      </div>

      {/* Metrics */}
      {[
        ['COP',   val(d.cop, 2),             warnVal(d.cop, 1.5, 99)],
        ['Power', val(d.power_kw, 1, 'kW'),  'var(--text-1)'],
        ['Q_e',   val(d.q_e_kw, 1, 'kW'),   'var(--text-1)'],
        ['SH',    val(d.superheat_suc, 1, 'K'), warnVal(d.superheat_suc, 2, 15)],
        ['SC',    val(d.subcooling, 1, 'K'),  warnVal(d.subcooling, 2, 15)],
        ['Pr',    val(d.pressure_ratio, 2),   warnVal(d.pressure_ratio, 0, 10)],
      ].map(([k, v, color]) => (
        <div key={k} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '3px 0', borderBottom: '1px solid var(--border)', fontSize: 11,
        }}>
          <span style={{ color: 'var(--text-3)' }}>{k}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, color }}>{v}</span>
        </div>
      ))}

      {/* Alarm list (ถ้ามี) */}
      {alarms.length > 0 && (
        <div style={{ marginTop: 7 }}>
          {alarms.slice(0, 2).map((a, i) => (
            <div key={i} style={{
              fontSize: 10, color: a.severity === 'Critical' ? '#a32d2d' : '#854f0b',
              background: a.severity === 'Critical' ? 'rgba(163,45,45,0.08)' : 'rgba(133,79,11,0.08)',
              borderRadius: 5, padding: '2px 6px', marginTop: 3,
            }}>
              {a.title}
            </div>
          ))}
        </div>
      )}

      {noData && (
        <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', marginTop: 8 }}>
          ไม่มีข้อมูล
        </div>
      )}

      {/* Timestamp */}
      {ts && (
        <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>
          {formatThaiTime(ts)}
        </div>
      )}
    </div>
  )
}

// ── Legend item ───────────────────────────────────────────
function LegendItem({ color, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-3)' }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}

// ── Main ─────────────────────────────────────────────────
export default function OverviewPage() {
  const navigate = useNavigate()
  const [fleet,     setFleet]     = useState({})   // { 'COMP-01': { diag, inp, ts }, ... }
  const [loading,   setLoading]   = useState(true)
  const [lastFetch, setLastFetch] = useState(null)
  const [countdown, setCountdown] = useState(30)
  const timerRef    = useRef(null)
  const countdownRef = useRef(null)

  // ── fetch ทุก compressor พร้อมกัน ────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const results = await Promise.all(
        COMPRESSORS.map(id => getMetrics(id, { limit: 1 }).catch(() => null))
      )
      const next = {}
      COMPRESSORS.forEach((id, idx) => {
        const data = results[idx]?.data?.[0]
        next[id] = {
          diag: data?.diagnosis      || null,
          inp:  data?.inputs_snapshot || null,
          ts:   data?.timestamp       || null,
        }
      })
      setFleet(next)
      setLastFetch(new Date())
      setCountdown(30)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchAll()
    timerRef.current     = setInterval(fetchAll, 30_000)
    countdownRef.current = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000)
    return () => { clearInterval(timerRef.current); clearInterval(countdownRef.current) }
  }, [fetchAll])

  // ── Derived ───────────────────────────────────────────────
  const compData = COMPRESSORS.map(id => ({ id, ...fleet[id] }))

  const totalPower   = compData.reduce((s, c) => s + (Number(c.diag?.power_kw) || 0), 0)
  const totalQe      = compData.reduce((s, c) => s + (Number(c.diag?.q_e_kw)  || 0), 0)
  const cops         = compData.map(c => Number(c.diag?.cop) || null).filter(Boolean)
  const avgCop       = cops.length ? cops.reduce((a, b) => a + b, 0) / cops.length : null
  const allAlarms    = compData.flatMap(c => (c.diag?.alarms || []).map(a => ({ ...a, comp: c.id, ts: c.ts })))
  const critCount    = allAlarms.filter(a => a.severity === 'Critical').length
  const warnCount    = allAlarms.filter(a => a.severity === 'Warning').length
  const runCount     = compData.filter(c => c.ts).length

  // status ของแต่ละ compressor
  const getStatus = (c) => {
    if (!c.ts) return '--'
    const alarms = c.diag?.alarms || []
    if (alarms.some(a => a.severity === 'Critical')) return 'Critical'
    if (alarms.some(a => a.severity === 'Warning'))  return 'Warning'
    return 'Normal'
  }
  const critComps = compData.filter(c => getStatus(c) === 'Critical').length
  const warnComps = compData.filter(c => getStatus(c) === 'Warning').length

  // chart data
  const isDark    = document.documentElement.classList.contains('dark') ||
                    window.matchMedia('(prefers-color-scheme: dark)').matches
  const textColor = isDark ? '#999' : '#888'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'

  const copValues = COMPRESSORS.map(id => Number(fleet[id]?.diag?.cop) || null)
  const shValues  = COMPRESSORS.map(id => Number(fleet[id]?.diag?.superheat_suc) || null)
  const pwValues  = COMPRESSORS.map(id => Number(fleet[id]?.diag?.power_kw) || 0)
  const shortLabels = COMPRESSORS.map(id => id.replace('COMP-', 'C'))

  const copChartData = {
    labels: shortLabels,
    datasets: [{
      label: 'COP',
      data: copValues,
      backgroundColor: copValues.map(v => v === null ? '#888' : v >= 1.5 ? '#378add' : '#e24b4a'),
      borderRadius: 4, barPercentage: 0.65,
    }],
  }

  const shChartData = {
    labels: shortLabels,
    datasets: [{
      label: 'Superheat (K)',
      data: shValues,
      backgroundColor: shValues.map(v => v === null ? '#888' : v > 15 ? '#e24b4a' : v < 2 ? '#f0883e' : '#1d9e75'),
      borderRadius: 4, barPercentage: 0.65,
    }],
  }

  const donutData = {
    labels: shortLabels,
    datasets: [{
      data: pwValues,
      backgroundColor: COMP_COLORS,
      borderWidth: 0,
    }],
  }

  const barOpts = (annotationY, maxY, unitSuffix) => ({
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1c2333' : '#fff',
        borderColor: isDark ? '#30363d' : '#e0e0e0',
        borderWidth: 1,
        bodyColor: isDark ? '#e6edf3' : '#333',
        callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed(2) ?? '--'}${unitSuffix}` }
      },
      annotation: annotationY !== null ? {
        annotations: {
          thr: {
            type: 'line', yMin: annotationY, yMax: annotationY,
            borderColor: '#e24b4a', borderWidth: 1.5, borderDash: [4, 3],
            label: { content: annotationY.toString(), display: true, position: 'end', font: { size: 9 }, color: '#e24b4a', backgroundColor: 'transparent', yAdjust: -8 }
          }
        }
      } : { annotations: {} },
    },
    scales: {
      x: { ticks: { color: textColor, font: { size: 10 }, maxRotation: 0 }, grid: { display: false } },
      y: { min: 0, max: maxY, ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
    },
  })

  const n = (v, d = 1) => v ? Number(v).toFixed(d) : '--'

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)' }}>
      <Navbar />

      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '14px 20px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Status bar ── */}
        <div style={{
          background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#639922' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>System online</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {runCount}/{COMPRESSORS.length} compressors
            {critComps > 0 && <span style={{ color: '#a32d2d' }}> · {critComps} critical</span>}
            {warnComps > 0 && <span style={{ color: '#854f0b' }}> · {warnComps} warning</span>}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-3)' }}>
            {lastFetch
              ? `อัพเดท ${lastFetch.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} · refresh ใน ${countdown}s`
              : 'กำลังโหลด…'}
          </span>
          <button
            onClick={fetchAll}
            style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 6,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer',
            }}
          >↻ Refresh</button>
        </div>

        {/* ── Fleet KPI ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'Total power',    value: totalPower ? `${totalPower.toFixed(1)} kW` : '--',  sub: 'ทุก compressor รวมกัน', color: 'var(--text-1)' },
            { label: 'Fleet avg COP',  value: avgCop ? avgCop.toFixed(2) : '--',                  sub: 'target ≥ 1.5',          color: avgCop && avgCop >= 1.5 ? '#27500a' : '#a32d2d' },
            { label: 'Total cooling',  value: totalQe ? `${totalQe.toFixed(1)} kW` : '--',        sub: 'Q_e รวมทั้งระบบ',       color: 'var(--text-1)' },
            { label: 'Active alarms',  value: critCount + warnCount,                               sub: `${critCount} critical · ${warnCount} warning`, color: (critCount + warnCount) > 0 ? '#a32d2d' : 'var(--text-1)', borderAlert: (critCount + warnCount) > 0 },
          ].map(({ label, value, sub, color, borderAlert }) => (
            <div key={label} style={{
              background: 'var(--bg1)', border: `1px solid ${borderAlert ? 'rgba(163,45,45,0.3)' : 'var(--border)'}`,
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Compressor cards ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)', fontSize: 13 }}>กำลังโหลดข้อมูล…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
            {compData.map(c => (
              <CompCard
                key={c.id}
                id={c.id}
                diag={c.diag}
                inp={c.inp}
                ts={c.ts}
                onClick={(id) => navigate(`/dashboard?comp=${id}`)}
              />
            ))}
          </div>
        )}

        {/* ── Charts row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px', gap: 10 }}>

          {/* COP bar chart */}
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              COP comparison
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <LegendItem color="#378add" label="≥ 1.5 — ปกติ" />
              <LegendItem color="#e24b4a" label="< 1.5 — ต่ำ" />
              <LegendItem color="#e24b4a" label="── threshold 1.5" />
            </div>
            <div style={{ position: 'relative', height: 200 }}>
              <Bar
                data={copChartData}
                options={barOpts(1.5, 2.5, '')}
              />
            </div>
          </div>

          {/* Superheat bar chart */}
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              Superheat (K)
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <LegendItem color="#1d9e75" label="2–15 K — ปกติ" />
              <LegendItem color="#f0883e" label="< 2 K — ต่ำ" />
              <LegendItem color="#e24b4a" label="> 15 K — สูง" />
              <LegendItem color="#e24b4a" label="── limit 15 K" />
            </div>
            <div style={{ position: 'relative', height: 200 }}>
              <Bar
                data={shChartData}
                options={barOpts(15, Math.max(20, ...shValues.filter(Boolean)) + 2, ' K')}
              />
            </div>
          </div>

          {/* Power donut */}
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
              Power distribution
            </div>
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-1)' }}>
                {totalPower.toFixed(1)} kW
              </span>
            </div>
            <div style={{ position: 'relative', height: 130 }}>
              <Doughnut
                data={donutData}
                options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false } }, animation: false }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 6px', marginTop: 10 }}>
              {COMPRESSORS.map((id, i) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-3)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: COMP_COLORS[i], flexShrink: 0 }} />
                  {id.replace('COMP-', 'C')} {n(fleet[id]?.diag?.power_kw)} kW
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Alarm table ── */}
        {allAlarms.length > 0 && (
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Active alarms
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                background: 'rgba(163,45,45,0.12)', color: '#a32d2d',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a32d2d' }} />
                {allAlarms.length} active
              </span>
            </div>

            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '72px 72px 1fr 100px 1fr', gap: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
              {['Severity', 'Compressor', 'Alarm', 'เวลา', 'Recommendation'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)' }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {allAlarms.map((a, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '72px 72px 1fr 100px 1fr',
                gap: 8, alignItems: 'center', padding: '7px 0',
                borderBottom: i < allAlarms.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <StatusBadge severity={a.severity} />
                <span
                  onClick={() => navigate(`/dashboard?comp=${a.comp}`)}
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {a.comp}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-1)' }}>{a.title}</span>
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-3)' }}>
                  {formatThaiTime(a.ts)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {(a.recommendation || []).slice(0, 2).join(' · ')}
                </span>
              </div>
            ))}
          </div>
        )}

        {allAlarms.length === 0 && !loading && (
          <div style={{
            background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#639922' }} />
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>ไม่มี alarm ทุก compressor ทำงานปกติ</span>
          </div>
        )}

      </div>
    </div>
  )
}
