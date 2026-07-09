import { useState, useEffect, useCallback, useMemo } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { getMetrics } from '../../services/api'
import { formatThaiTime } from '../../utils/format'
import { useCompressors } from '../../hooks/useCompressors'
import { STALE_THRESHOLD_SEC } from '../../utils/staleConfig'
import CompCard from './CompCard'
import StatusBadge from './StatusBadge'

const COMP_COLORS = ['#378add','#1d9e75','#ba7517','#534ab7','#d4537e','#854f0b','#a32d2d']

const COLOR_BLUE = '#378add'
const COLOR_RED = '#e24b4a'
const COLOR_GREEN = '#1d9e75'
const COLOR_ORANGE = '#f0883e'

const COP_THRESHOLD = 1.5
const SUPERHEAT_MIN = 2
const SUPERHEAT_MAX = 15

const n = (v, d = 1) => v ? Number(v).toFixed(d) : '--'

function LegendItem({ color, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-3)' }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}

function barOpts(annotationY, maxY, unitSuffix, textColor, gridColor) {
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1c2333', borderColor: '#30363d', borderWidth: 1, bodyColor: '#e6edf3',
        callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed(2) ?? '--'}${unitSuffix}` },
      },
      annotation: annotationY !== null ? {
        annotations: {
          thr: {
            type: 'line', yMin: annotationY, yMax: annotationY,
            borderColor: '#e24b4a', borderWidth: 1.5, borderDash: [4, 3],
            label: { content: annotationY.toString(), display: true, position: 'end', font: { size: 9 }, color: '#e24b4a', backgroundColor: 'transparent', yAdjust: -8 },
          },
        },
      } : { annotations: {} },
    },
    scales: {
      x: { ticks: { color: textColor, font: { size: 10 }, maxRotation: 0 }, grid: { display: false } },
      y: { min: 0, max: maxY, ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
    },
  }
}

export default function FleetOverview({ onSelectComp }) {
  const { ids: COMPRESSORS, loading: compLoading } = useCompressors()
  const [fleet, setFleet]     = useState({})
  const [loading, setLoading] = useState(true)
  const [screenW, setScreenW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const h = () => setScreenW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const isMobile = screenW < 640
  const isTablet = screenW < 1024


  const fetchAll = useCallback(async () => {
    if (!COMPRESSORS.length) return
    try {
      const results = await Promise.all(COMPRESSORS.map(id => getMetrics(id, { limit: 1 }).catch(() => null)))
      const next = {}
      COMPRESSORS.forEach((id, idx) => {
        const data = results[idx]?.data?.[0]
        next[id] = { diag: data?.diagnosis || null, ts: data?.timestamp || null }
      })
      setFleet(next)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [COMPRESSORS])

  useEffect(() => {
    if (compLoading) return
    fetchAll()
    const timer = setInterval(fetchAll, 30_000)
    return () => clearInterval(timer)
  }, [fetchAll])

  // stale = เคยมีข้อมูล (ts ไม่ null) แต่ไม่มีค่าใหม่เข้ามานานเกิน threshold แล้ว
  // ใช้ useMemo เพื่อไม่ให้ recalculate ทุก render (ลดการ flicker)
  const { compData, allAlarms, critCount, warnCount, totalPower, totalQe, avgCop } = useMemo(() => {
    const data = COMPRESSORS.map(id => {
      const c = { id, ...fleet[id] }
      const staleSeconds = c.ts ? Math.floor((Date.now() - new Date(c.ts).getTime()) / 1000) : null
      const stale = staleSeconds !== null && staleSeconds > STALE_THRESHOLD_SEC
      return { ...c, staleSeconds, stale }
    })
    const tp = data.reduce((s, c) => s + (Number(c.diag?.power_kw) || 0), 0)
    const tq = data.reduce((s, c) => s + (Number(c.diag?.q_e_kw) || 0), 0)
    const cops = data.map(c => Number(c.diag?.cop) || null).filter(Boolean)
    const ac = cops.length ? cops.reduce((a, b) => a + b, 0) / cops.length : null
    const diags = data.flatMap(c => (c.diag?.alarms || []).map(a => ({ ...a, comp: c.id, ts: c.ts })))

    const staleComps = data.filter(c => c.stale).map(c => c.id)
    const staleAlert = staleComps.length > 0 ? [{
      severity: 'Warning', comp: 'SYSTEM', ts: new Date().toISOString(),
      title: `ตรวจสอบเซนเซอร์ — ${staleComps.join(', ')} ไม่ได้รับค่า > 1 นาที`,
      recommendation: ['ตรวจสอบการเชื่อมต่อ sensor / เครือข่าย'],
    }] : []

    const allAlm = [...diags, ...staleAlert]
    return {
      compData: data,
      allAlarms: allAlm,
      critCount: allAlm.filter(a => a.severity === 'Critical').length,
      warnCount: allAlm.filter(a => a.severity === 'Warning').length,
      totalPower: tp,
      totalQe: tq,
      avgCop: ac,
    }
  }, [COMPRESSORS, fleet])

  const isDark     = document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches
  const textColor  = isDark ? '#999' : '#888'
  const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const shortLabels = useMemo(() => COMPRESSORS.map(id => id.replace('COMP-', 'C')), [COMPRESSORS])

  // chart data — useMemo เพื่อไม่ recalculate ทุก render
  const { copValues, shValues, pwValues } = useMemo(() => ({
    copValues: COMPRESSORS.map(id => Number(fleet[id]?.diag?.cop) || null),
    shValues:  COMPRESSORS.map(id => Number(fleet[id]?.diag?.superheat_suc) || null),
    pwValues:  COMPRESSORS.map(id => Number(fleet[id]?.diag?.power_kw) || 0),
  }), [COMPRESSORS, fleet])

  const fleetKpis = useMemo(() => [
    { label: 'Total power',   value: totalPower ? `${totalPower.toFixed(1)} kW` : '--', sub: 'ทุก compressor รวมกัน', color: 'var(--text-1)' },
    { label: 'Fleet avg COP', value: avgCop ? avgCop.toFixed(2) : '--', sub: 'target ≥ 1.5', color: avgCop && avgCop >= COP_THRESHOLD ? 'var(--green)' : 'var(--red)' },
    { label: 'Total cooling', value: totalQe ? `${totalQe.toFixed(1)} kW` : '--', sub: 'Q_e รวมทั้งระบบ', color: 'var(--text-1)' },
    { label: 'Active alarms', value: critCount + warnCount, sub: `${critCount} critical · ${warnCount} warning`, color: (critCount + warnCount) > 0 ? 'var(--red)' : 'var(--text-1)', borderAlert: (critCount + warnCount) > 0 },
  ], [totalPower, avgCop, totalQe, critCount, warnCount])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Fleet KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10 }}>
        {fleetKpis.map(({ label, value, sub, color, borderAlert }) => (
          <div key={label} style={{ background: 'var(--bg1)', border: `1px solid ${borderAlert ? 'rgba(163,45,45,0.3)' : 'var(--border)'}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Compressor cards */}
      {loading || compLoading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)', fontSize: 13 }}>กำลังโหลดข้อมูล…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(4, minmax(0, 1fr))' : 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
          {compData.map(c => <CompCard key={c.id} id={c.id} diag={c.diag} ts={c.ts} stale={c.stale} staleSeconds={c.staleSeconds} onClick={onSelectComp} isMobile={isMobile} />)}
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 220px', gap: 10 }}>
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>COP comparison</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            <LegendItem color={COLOR_BLUE} label="≥ 1.5 — ปกติ" />
            <LegendItem color={COLOR_RED} label="< 1.5 — ต่ำ" />
            <LegendItem color={COLOR_RED} label="── threshold 1.5" />
          </div>
          <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
            <Bar
              data={{ labels: shortLabels, datasets: [{ label: 'COP', data: copValues, backgroundColor: copValues.map(v => v === null ? '#888' : v >= COP_THRESHOLD ? COLOR_BLUE : COLOR_RED), borderRadius: 4, barPercentage: 0.65 }] }}
              options={barOpts(COP_THRESHOLD, Math.max(3, ...copValues.filter(Boolean)) * 1.15, '', textColor, gridColor)}
            />
          </div>
        </div>

        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Superheat (K)</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            <LegendItem color={COLOR_GREEN} label="2–15 K — ปกติ" />
            <LegendItem color={COLOR_ORANGE} label="< 2 K — ต่ำ" />
            <LegendItem color={COLOR_RED} label="> 15 K — สูง" />
          </div>
          <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
            <Bar
              data={{ labels: shortLabels, datasets: [{ label: 'Superheat (K)', data: shValues, backgroundColor: shValues.map(v => v === null ? '#888' : v > SUPERHEAT_MAX ? COLOR_RED : v < SUPERHEAT_MIN ? COLOR_ORANGE : COLOR_GREEN), borderRadius: 4, barPercentage: 0.65 }] }}
              options={barOpts(SUPERHEAT_MAX, Math.max(20, ...shValues.filter(Boolean)) + 2, ' K', textColor, gridColor)}
            />
          </div>
        </div>

        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Power distribution</div>
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-1)' }}>{totalPower.toFixed(1)} kW</span>
          </div>
          <div style={{ position: 'relative', height: 130, overflow: 'hidden' }}>
            <Doughnut
              data={{ labels: shortLabels, datasets: [{ data: pwValues, backgroundColor: COMPRESSORS.map((_, i) => COMP_COLORS[i % COMP_COLORS.length]), borderWidth: 0 }] }}
              options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false } }, animation: false }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 6px', marginTop: 10 }}>
            {COMPRESSORS.map((id, i) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-3)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: COMP_COLORS[i % COMP_COLORS.length], flexShrink: 0 }} />
                {id.replace('COMP-', 'C')} {n(fleet[id]?.diag?.power_kw)} kW
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alarm table */}
      {allAlarms.length > 0 ? (
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Active alarms</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(163,45,45,0.12)', color: 'var(--red)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)' }} />{allAlarms.length} active
            </span>
          </div>
          {isMobile ? (
            /* Mobile: card-style alarm rows */
            allAlarms.map((a, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < allAlarms.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <StatusBadge severity={a.severity} />
                  <span onClick={() => onSelectComp(a.comp)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>{a.comp}</span>
                  <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-3)', marginLeft: 'auto' }}>{formatThaiTime(a.ts)}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-1)', marginBottom: 3 }}>{a.title}</div>
                {(a.recommendation || []).length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{(a.recommendation || []).slice(0, 2).join(' · ')}</div>
                )}
              </div>
            ))
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '72px 72px 1fr 100px 1fr', gap: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                {['Severity', 'Compressor', 'Alarm', 'เวลา', 'Recommendation'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)' }}>{h}</span>
                ))}
              </div>
              {allAlarms.map((a, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '72px 72px 1fr 100px 1fr', gap: 8, alignItems: 'center', padding: '7px 0', borderBottom: i < allAlarms.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <StatusBadge severity={a.severity} />
                  <span onClick={() => onSelectComp(a.comp)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>{a.comp}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-1)' }}>{a.title}</span>
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-3)' }}>{formatThaiTime(a.ts)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{(a.recommendation || []).slice(0, 2).join(' · ')}</span>
                </div>
              ))}
            </>
          )}
        </div>
      ) : !loading && (
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#639922' }} />
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>ไม่มี alarm ทุก compressor ทำงานปกติ</span>
        </div>
      )}
    </div>
  )
}
