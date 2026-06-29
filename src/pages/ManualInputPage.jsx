import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import { postMetrics } from '../services/api'
import { COMPRESSORS, COMPRESSOR_TYPE, COMPRESSOR_TYPE_LABEL, getDefaultPressures } from '../utils/format'

function Field({ label, id, value, onChange, required, optional, assumeText }) {
  const hasVal = value !== ''
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: 'var(--text-2)', marginBottom: 5 }}>
        <span style={{ flex: 1 }}>{label}</span>
        {optional && (
          <span style={{
            fontSize: 10, padding: '1px 7px', borderRadius: 8,
            background: hasVal ? 'rgba(63,185,80,0.12)' : 'rgba(107,114,128,0.12)',
            color: hasVal ? 'var(--green)' : 'var(--text-2)',
            fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap',
          }}>
            {hasVal ? 'measured' : assumeText}
          </span>
        )}
      </label>
      <input
        type="number" step="any" id={id}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={optional ? `เว้นว่าง → ${assumeText}` : '0.00'}
        required={required}
        style={{
          width: '100%', padding: '8px 10px', fontSize: 13,
          fontFamily: 'JetBrains Mono, monospace',
          background: 'var(--bg2)',
          border: `1px solid ${hasVal && optional ? 'var(--green)' : 'var(--border)'}`,
          borderRadius: 8, color: 'var(--text-1)', outline: 'none',
        }}
      />
    </div>
  )
}

function SectionLabel({ label, color }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', color,
      paddingBottom: 6, marginTop: 12,
      borderBottom: '1px solid var(--border)',
    }}>{label}</div>
  )
}

export default function ManualInputPage() {
  const navigate = useNavigate()
  const initComp = 'COMP-01'
  const initType = COMPRESSOR_TYPE[initComp]
  const initPressures = getDefaultPressures(initType)
  const [compId, setCompId] = useState(initComp)
  const [compType, setCompType] = useState(initType)
  const [form, setForm] = useState({
    sp: String(initPressures.sp), dp: String(initPressures.dp),
    st: '', dt: '', liqTemp: '', amp: '', roomTemp: '', condTemp: '',
  })
  const [status, setStatus] = useState(null)

  const handleCompChange = (id, overrideType) => {
    const type = overrideType ?? COMPRESSOR_TYPE[id] ?? 'single'
    setCompId(id)
    setCompType(type)
    const { sp, dp } = getDefaultPressures(type)
    setForm(f => ({ ...f, sp: sp !== '' ? String(sp) : '', dp: dp !== '' ? String(dp) : '' }))
  }

  const set = key => val => setForm(f => ({ ...f, [key]: val }))
  const pf  = key => form[key] !== '' ? parseFloat(form[key]) : undefined

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    try {
      await postMetrics({
        compressor_id:          compId,
        compressor_type:        compType,
        sp_kg:                  pf('sp'),
        dp_kg:                  pf('dp'),
        st_c:                   pf('st'),
        dt_c:                   pf('dt'),
        liquid_temp_c:          pf('liqTemp'),
        current_amp:            pf('amp'),
        evaporator_room_temp_c: pf('roomTemp'),
        condenser_temp_c:       pf('condTemp'),
      })
      setStatus('success')
      setTimeout(() => navigate('/dashboard', { state: { fromInput: compId } }), 400)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg0)' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, padding: '24px 20px 40px' }}>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>Manual Input</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 20 }}>
            V = 385V · PF = 0.86 (ค่าคงที่) · ช่องที่มี badge <span style={{ color: 'var(--green)' }}>optional</span> เว้นว่างได้
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-2)', marginBottom: 5 }}>Compressor</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={compId} onChange={e => handleCompChange(e.target.value)}
                  style={{ flex: 1, padding: '8px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', outline: 'none' }}>
                  {COMPRESSORS.map(c => <option key={c}>{c}</option>)}
                </select>
                {/* Type badge — COMP-05 S/W สามารถ toggle ได้ */}
                {compId === 'COMP-05' ? (
                  <button type="button" onClick={() => handleCompChange(compId, compType === 'booster' ? 'high_stage' : 'booster')}
                    style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 8, cursor: 'pointer', border: '1px solid var(--amber)', background: 'rgba(210,153,34,0.12)', color: 'var(--amber)', whiteSpace: 'nowrap' }}>
                    ⚡ S/W: {COMPRESSOR_TYPE_LABEL[compType]}
                  </button>
                ) : (
                  <span style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 8, border: `1px solid ${compType === 'high_stage' ? 'var(--cyan)' : 'var(--green)'}`, background: compType === 'high_stage' ? 'rgba(57,197,207,0.1)' : 'rgba(63,185,80,0.1)', color: compType === 'high_stage' ? 'var(--cyan)' : 'var(--green)', whiteSpace: 'nowrap' }}>
                    {COMPRESSOR_TYPE_LABEL[compType]}
                  </span>
                )}
              </div>
              {compType === 'booster' && (
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>SP = LP suction · DP = Intermediate · COP threshold 1.5</div>
              )}
              {compType === 'high_stage' && (
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>SP = Intermediate suction · DP = HP · COP threshold 2.5</div>
              )}
            </div>

            <SectionLabel label="Suction" color="var(--cyan)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="SP (kg/cm²g)" id="sp" value={form.sp} onChange={set('sp')} required />
              <Field label="ST (°C)" id="st" value={form.st} onChange={set('st')} optional assumeText="assume SH=5K" />
            </div>

            <SectionLabel label="Discharge" color="var(--red)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="DP (kg/cm²g)" id="dp" value={form.dp} onChange={set('dp')} required />
              <Field label="DT (°C)" id="dt" value={form.dt} onChange={set('dt')} optional assumeText="assume η=0.70" />
            </div>

            <SectionLabel label="Extra" color="var(--text-2)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Liquid Temp (°C)"   id="liqTemp"  value={form.liqTemp}  onChange={set('liqTemp')}  optional assumeText="assume SC=0" />
              <Field label="Current (A)"         id="amp"      value={form.amp}      onChange={set('amp')}      optional assumeText="ไม่คำนวณ P_comp" />
              <Field label="Room Temp (°C)"      id="roomTemp" value={form.roomTemp} onChange={set('roomTemp')} optional assumeText="ไม่คำนวณ ΔT" />
              <Field label="Condenser Temp (°C)" id="condTemp" value={form.condTemp} onChange={set('condTemp')} optional assumeText="ไม่คำนวณ Approach" />
            </div>

            {status === 'error' && (
              <div style={{ fontSize: 11, color: 'var(--red)', background: 'var(--red-dim)', padding: '6px 10px', borderRadius: 6 }}>
                บันทึกไม่สำเร็จ กรุณาลองใหม่
              </div>
            )}
            {status === 'success' && (
              <div style={{ fontSize: 11, color: 'var(--green)', background: 'var(--green-dim)', padding: '6px 10px', borderRadius: 6 }}>
                ✅ บันทึกสำเร็จ กำลัง redirect…
              </div>
            )}

            <button type="submit" className="btn-primary"
              disabled={status === 'loading'}
              style={{ width: '100%', padding: 11, fontSize: 13, marginTop: 8, opacity: status === 'loading' ? 0.7 : 1 }}>
              {status === 'loading' ? 'กำลังบันทึก…' : 'Save Data'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}