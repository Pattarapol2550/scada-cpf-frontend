import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { postMetrics } from '../services/api'

const COMPRESSORS = ['COMP-01','COMP-02','COMP-03','COMP-04','COMP-05','COMP-06','COMP-07']

function Field({ label, id, value, onChange, required }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-2)', marginBottom: 5 }}>
        {label}
      </label>
      <input
        type="number" step="any" id={id}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder="0.00" required={required}
        style={{
          width: '100%', padding: '8px 10px', fontSize: 13,
          fontFamily: 'JetBrains Mono, monospace',
          background: 'var(--bg2)', border: '1px solid var(--border)',
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
  const [compId, setCompId] = useState('COMP-01')
  const [form, setForm] = useState({
    sp: '', st: '', dp: '', dt: '',
    liqTemp: '', massFlow: '', amp: '', fanPump: '', roomTemp: '', condTemp: '',
  })
  const [status, setStatus] = useState(null)

  const set = key => val => setForm(f => ({ ...f, [key]: val }))
  const pf  = key => form[key] !== '' ? parseFloat(form[key]) : undefined

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    try {
      await postMetrics({
        compressor_id: compId,
        sp_kg: pf('sp'), st_c: pf('st'),
        dp_kg: pf('dp'), dt_c: pf('dt'),
        liquid_temp_c: pf('liqTemp'),
        mass_flow_kg_s: pf('massFlow'),
        current_amp: pf('amp'),
        fan_pump_kw: pf('fanPump'),
        evaporator_room_temp_c: pf('roomTemp'),
        condenser_temp_c: pf('condTemp'),
      })
      setStatus('success')
      setTimeout(() => navigate('/dashboard'), 1200)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)' }}>
      <Navbar />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 40px' }}>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 20 }}>Manual Input</div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-2)', marginBottom: 5 }}>Compressor</label>
              <select value={compId} onChange={e => setCompId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', outline: 'none' }}>
                {COMPRESSORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <SectionLabel label="Suction" color="var(--cyan)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="SP (kg/cm²)" id="sp" value={form.sp} onChange={set('sp')} required />
              <Field label="ST (°C)"     id="st" value={form.st} onChange={set('st')} required />
            </div>

            <SectionLabel label="Discharge" color="var(--red)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="DP (kg/cm²)" id="dp" value={form.dp} onChange={set('dp')} required />
              <Field label="DT (°C)"     id="dt" value={form.dt} onChange={set('dt')} required />
            </div>

            <SectionLabel label="Extra" color="var(--text-2)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Liquid Temp (°C)"    id="liqTemp"  value={form.liqTemp}  onChange={set('liqTemp')} />
              <Field label="Mass Flow (kg/s)"     id="massFlow" value={form.massFlow} onChange={set('massFlow')} />
              <Field label="Current (A)"          id="amp"      value={form.amp}      onChange={set('amp')} />
              <Field label="Fan / Pump (kW)"      id="fanPump"  value={form.fanPump}  onChange={set('fanPump')} />
              <Field label="Room Temp (°C)"       id="roomTemp" value={form.roomTemp} onChange={set('roomTemp')} />
              <Field label="Condenser Temp (°C)"  id="condTemp" value={form.condTemp} onChange={set('condTemp')} />
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
