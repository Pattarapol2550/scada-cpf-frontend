const ROWS = [
  { label: 'Cooling Capacity', key: 'calculated_ql_kw', unit: 'kW' },
  { label: 'Compressor Power', key: 'power_kw',          unit: 'kW' },
  { label: 'Actual COP',       key: 'actual_cop',        unit: ''   },
  { label: 'System COP',       key: 'system_cop',        unit: ''   },
  { label: 'Cycle COP',        key: 'cycle_cop',         unit: ''   },
  { label: 'Superheat',        key: 'superheat_suc',     unit: '°C' },
  { label: 'Subcooling',       key: 'subcooling',        unit: '°C' },
  { label: 'Pressure Ratio',   key: 'pressure_ratio',    unit: ''   },
]

function chipStyle(status) {
  const map = {
    Normal:   { color: 'var(--green)',  bg: 'var(--green-dim)',  border: 'rgba(63,185,80,0.3)'  },
    Warning:  { color: 'var(--amber)',  bg: 'var(--amber-dim)',  border: 'rgba(210,153,34,0.3)' },
    Critical: { color: 'var(--red)',    bg: 'var(--red-dim)',    border: 'rgba(248,81,73,0.3)'  },
  }
  return map[status] || { color: 'var(--text-2)', bg: 'var(--bg2)', border: 'var(--border)' }
}

export default function DiagnosisReport({ diag }) {
  if (!diag) return <div style={{ color: 'var(--text-3)', fontSize: 12 }}>ไม่มีข้อมูล</div>

  const sensorSt    = diag.systems?.sensor?.status    ?? 'Unknown'
  const sensorTxt   = diag.systems?.sensor?.text      ?? '--'
  const condenserSt = diag.systems?.condenser?.status ?? 'Unknown'

  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['Parameter', 'Value', 'Unit'].map(h => (
              <th key={h} style={{
                textAlign: 'left', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--text-3)', paddingBottom: 8,
                borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(({ label, key, unit }) => (
            <tr key={key}>
              <td style={{ padding: '7px 8px 7px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }}>{label}</td>
              <td style={{ padding: '7px 8px 7px 0', borderBottom: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--text-1)' }}>{diag[key] ?? '--'}</td>
              <td style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontFamily: 'monospace', fontSize: 10 }}>{unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {[
          { label: `Sensor: ${sensorSt} — ${sensorTxt}`, status: sensorSt },
          { label: `Condenser: ${condenserSt}`,           status: condenserSt },
        ].map(({ label, status }) => {
          const s = chipStyle(status)
          return (
            <span key={label} style={{
              fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              color: s.color, background: s.bg, border: `1px solid ${s.border}`,
            }}>{label}</span>
          )
        })}
      </div>
    </>
  )
}
