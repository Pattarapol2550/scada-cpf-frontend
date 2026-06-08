import { useState } from 'react'

const MAIN_ROWS = [
  { label: 'P_comp',        key: 'power_kw',        unit: 'kW' },
  { label: 'COP',           key: 'cop',             unit: '—'  },
  { label: 'Q_e',           key: 'q_e_kw',          unit: 'kW' },
  { label: 'Superheat',     key: 'superheat_suc',   unit: 'K'  },
  { label: 'Subcooling',    key: 'subcooling',       unit: 'K'  },
  { label: 'Press. Ratio',  key: 'pressure_ratio',  unit: '—'  },
]

const DETAIL_SECTIONS = [
  {
    title: 'Saturation (CoolProp)',
    rows: [
      { label: 'T_evap จาก SP',  key: 't_evap_c',      unit: '°C' },
      { label: 'T_cond จาก DP',  key: 't_cond_c',      unit: '°C' },
      { label: 'Superheat',       key: 'superheat_suc', unit: 'K'  },
      { label: 'Subcool',         key: 'subcooling',    unit: 'K'  },
    ]
  },
  {
    title: 'Enthalpy (CoolProp)',
    rows: [
      { label: 'h1 — เข้า Compressor', key: 'h1',  unit: 'kJ/kg' },
      { label: 'h2 — ออก Compressor',  key: 'h2',  unit: 'kJ/kg' },
      { label: 'h2s — isentropic',      key: 'h2s', unit: 'kJ/kg' },
      { label: 'η_isentropic',          key: 'eta_is_pct', unit: '%' },
      { label: 'h3 = h4 — หลัง Cond.', key: 'h3',  unit: 'kJ/kg' },
    ]
  },
  {
    title: 'Output',
    rows: [
      { label: 'q_L = h1−h4',    key: 'q_l_kgkg',    unit: 'kJ/kg' },
      { label: 'w_comp = h2−h1', key: 'w_comp_kgkg', unit: 'kJ/kg' },
      { label: 'ṁ',              key: 'm_dot_kgh',   unit: 'kg/h'  },
      { label: 'Modes',          key: 'modes_text',  unit: ''      },
    ]
  },
]

function chipStyle(status) {
  const map = {
    Normal:   { color: 'var(--green)',  bg: 'var(--green-dim)',  border: 'rgba(63,185,80,0.3)'  },
    Warning:  { color: 'var(--amber)',  bg: 'var(--amber-dim)',  border: 'rgba(210,153,34,0.3)' },
    Critical: { color: 'var(--red)',    bg: 'var(--red-dim)',    border: 'rgba(248,81,73,0.3)'  },
  }
  return map[status] || { color: 'var(--text-2)', bg: 'var(--bg2)', border: 'var(--border)' }
}

function TD({ children, mono }) {
  return (
    <td style={{
      padding: '7px 8px 7px 0',
      borderBottom: '1px solid var(--border)',
      fontFamily: mono ? 'JetBrains Mono, monospace' : undefined,
      fontWeight: mono ? 600 : undefined,
      color: mono ? 'var(--text-1)' : 'var(--text-2)',
      fontSize: 12,
    }}>{children ?? '--'}</td>
  )
}

export default function DiagnosisReport({ diag }) {
  const [detailOpen, setDetailOpen] = useState(false)
  if (!diag) return <div style={{ color: 'var(--text-3)', fontSize: 12 }}>ไม่มีข้อมูล</div>

  const sensorSt  = diag.systems?.sensor?.status    ?? 'Unknown'
  const sensorTxt = diag.systems?.sensor?.text      ?? '--'
  const condSt    = diag.systems?.condenser?.status ?? 'Unknown'

  // build flat detail values
  const detail = {
    t_evap_c:    diag.enthalpy?.t_evap_c,
    t_cond_c:    diag.enthalpy?.t_cond_c,
    superheat_suc: diag.superheat_suc,
    subcooling:  diag.subcooling,
    h1:          diag.enthalpy?.h1,
    h2:          diag.enthalpy?.h2,
    h2s:         diag.enthalpy?.h2s,
    eta_is_pct:  diag.enthalpy?.eta_is_pct,
    h3:          diag.enthalpy?.h3,
    q_l_kgkg:   diag.enthalpy?.q_l_kgkg,
    w_comp_kgkg: diag.enthalpy?.w_comp_kgkg,
    m_dot_kgh:   diag.m_dot_kgh,
    modes_text:  diag.modes
      ? `ST: ${diag.modes.sh_mode} · DT: ${diag.modes.dt_mode}`
      : '--',
  }

  return (
    <>
      {/* Main table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['Parameter','Value','Unit'].map(h => (
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
          {MAIN_ROWS.map(({ label, key, unit }) => (
            <tr key={key}>
              <TD>{label}</TD>
              <TD mono>{diag[key] ?? '--'}</TD>
              <td style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontFamily: 'monospace', fontSize: 10 }}>{unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* System chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {[
          { label: `Sensor: ${sensorSt} — ${sensorTxt}`, status: sensorSt },
          { label: `Condenser: ${condSt}`,                status: condSt  },
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

      {/* Collapsible detail */}
      <div style={{ marginTop: 12, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div
          onClick={() => setDetailOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', background: 'var(--bg2)',
            cursor: 'pointer', userSelect: 'none',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: 'var(--text-2)',
          }}
        >
          <span>รายละเอียด — Enthalpy & Cycle Points</span>
          <span style={{ transition: 'transform .2s', transform: detailOpen ? 'rotate(180deg)' : 'none', color: 'var(--text-3)' }}>▾</span>
        </div>

        {detailOpen && (
          <div style={{ padding: '0 12px 12px' }}>
            {DETAIL_SECTIONS.map(sec => (
              <div key={sec.title}>
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--text-3)',
                  padding: '10px 0 6px', borderBottom: '1px solid var(--border)',
                }}>{sec.title}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    {sec.rows.map(({ label, key, unit }) => (
                      <tr key={key}>
                        <TD>{label}</TD>
                        <TD mono>{detail[key] ?? '--'}</TD>
                        <td style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontFamily: 'monospace', fontSize: 10 }}>{unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}