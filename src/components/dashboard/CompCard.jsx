import StatusBadge from './StatusBadge'
import { formatThaiTime } from '../../utils/format'

function val(v, dec = 2, unit = '') {
  return (v === null || v === undefined || v === '--') ? '--' : `${Number(v).toFixed(dec)}${unit ? ' ' + unit : ''}`
}

function warnColor(v, lo, hi, hasCrit) {
  const n = Number(v); if (isNaN(n)) return 'var(--text-1)'
  if (n < lo || n > hi) return hasCrit ? '#a32d2d' : '#854f0b'
  return 'var(--text-1)'
}

const TYPE_COLOR = { booster: 'var(--green)', high_stage: 'var(--cyan)', single: 'var(--text-3)' }
const TYPE_LABEL = { booster: 'Booster', high_stage: 'High Stage', single: '' }

export default function CompCard({ id, diag, ts, stale, staleSeconds, onClick, isMobile }) {
  const d = diag || {}
  const alarms     = d.alarms || []
  const hasCrit    = alarms.some(a => a.severity === 'Critical')
  const hasWarn    = alarms.some(a => a.severity === 'Warning') || stale
  const noData     = !ts
  const severity   = noData ? '--' : hasCrit ? 'Critical' : hasWarn ? 'Warning' : 'Normal'
  const borderColor = hasCrit ? 'rgba(163,45,45,0.45)' : hasWarn ? 'rgba(133,79,11,0.4)' : 'var(--border)'

  // ใช้ cop_threshold จาก backend response (booster=1.5, high_stage=2.5)
  const copThreshold = d.cop_threshold ?? 1.5

  const metrics = [
    ['COP',   val(d.cop, 2),               warnColor(d.cop, copThreshold, 99, hasCrit)],
    ['Power', val(d.power_kw, 1, 'kW'),    'var(--text-1)'],
    ['Q_e',   val(d.q_e_kw, 1, 'kW'),      'var(--text-1)'],
    ['SH',    val(d.superheat_suc, 1, 'K'), warnColor(d.superheat_suc, 2, 15, hasCrit)],
    ['SC',    val(d.subcooling, 1, 'K'),    warnColor(d.subcooling, 2, 15, hasCrit)],
    ['Pr',    val(d.pressure_ratio, 2),     warnColor(d.pressure_ratio, 0, 10, hasCrit)],
  ]

  return (
    <div
      onClick={() => onClick(id)}
      style={{ background: 'var(--bg1)', border: `1px solid ${borderColor}`, borderRadius: 12, padding: isMobile ? '12px 14px' : '11px 12px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg1)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: isMobile ? 13 : 12, fontWeight: 700, color: 'var(--text-1)' }}>{id}</span>
          {d.compressor_type && d.compressor_type !== 'single' && (
            <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4, color: TYPE_COLOR[d.compressor_type], background: `${TYPE_COLOR[d.compressor_type]}1a` }}>
              {TYPE_LABEL[d.compressor_type]}
            </span>
          )}
        </div>
        <StatusBadge severity={severity} />
      </div>

      {isMobile ? (
        /* Mobile: 2-column grid, label on top / value below */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
          {metrics.map(([k, v, color]) => (
            <div key={k} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color }}>{v}</div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: label + value on same row */
        metrics.map(([k, v, color]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
            <span style={{ color: 'var(--text-3)' }}>{k}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, color }}>{v}</span>
          </div>
        ))
      )}

      {alarms.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {alarms.slice(0, 2).map((a, i) => (
            <div key={i} style={{ fontSize: 10, color: a.severity === 'Critical' ? '#a32d2d' : '#854f0b', background: a.severity === 'Critical' ? 'rgba(163,45,45,0.08)' : 'rgba(133,79,11,0.08)', borderRadius: 5, padding: '3px 7px', marginTop: 3 }}>
              {a.title}
            </div>
          ))}
        </div>
      )}
      {stale && (
        <div style={{ fontSize: 10, color: '#854f0b', background: 'rgba(133,79,11,0.08)', borderRadius: 5, padding: '3px 7px', marginTop: 3 }}>
          ⚠ ตรวจสอบเซนเซอร์
        </div>
      )}
      {noData && <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', marginTop: 8 }}>ไม่มีข้อมูล</div>}
      {ts && <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>{formatThaiTime(ts)}</div>}
    </div>
  )
}
