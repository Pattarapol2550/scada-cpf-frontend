/**
 * CalculatorPage.jsx
 * NH3 Refrigeration Calculator — fetch ไป BE2 backend โดยตรง
 * POST /api/calculate      → Single-stage (CoolProp บน Render)
 * POST /api/calculate_two  → Two-stage   (CoolProp บน Render)
 *
 * วิธีติดตั้ง:
 *  1. วางไฟล์นี้ใน src/pages/CalculatorPage.jsx
 *  2. App.jsx:
 *       import CalculatorPage from './pages/CalculatorPage'
 *       <Route path="/calculator" element={<ProtectedRoute><CalculatorPage /></ProtectedRoute>} />
 *  3. Navbar.jsx NAV_LINKS เพิ่ม:
 *       { to: '/calculator', label: 'Calculator' }
 *  4. Backend: เพิ่ม /api/calculate และ /api/calculate_two ใน main.py (ดูไฟล์ main.py ที่แก้แล้ว)
 */

import { useState } from 'react'
import Navbar from '../components/layout/Navbar'
import api from '../services/api'   // axios instance ที่มี JWT interceptor อยู่แล้ว

const fmt = (v, d = 2) => (v != null && !isNaN(Number(v)) ? Number(v).toFixed(d) : '—')

// ─── UI primitives ────────────────────────────────────────────────────────────

function Panel({ children }) {
  return <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>{children}</div>
}

function PanelHead({ num, label, color = 'var(--blue)' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)' }}>
      <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, fontWeight:700, background:color, color:'#fff', width:20, height:20, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{num}</span>
      <span style={{ fontSize:13, fontWeight:500 }}>{label}</span>
    </div>
  )
}

function Notice({ children, color = 'var(--blue)' }) {
  return <div style={{ borderRadius:6, padding:'7px 12px', marginBottom:11, fontFamily:'JetBrains Mono, monospace', fontSize:11, color, lineHeight:1.6, background:`${color}18`, border:`1px solid ${color}44` }}>{children}</div>
}

function Field({ label, unit, value, onChange, placeholder, optional, assumeText }) {
  const has = value !== ''
  return (
    <div style={{ marginBottom:10 }}>
      <label style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, fontSize:11, fontFamily:'JetBrains Mono, monospace', color:'var(--text-2)' }}>
        <span style={{ flex:1 }}>{label}{unit && <span style={{ color:'var(--text-3)' }}> [{unit}]</span>}</span>
        {optional && (
          <span style={{ fontSize:10, padding:'1px 7px', borderRadius:8, whiteSpace:'nowrap', background: has ? 'var(--green-dim)' : 'rgba(139,148,158,0.1)', color: has ? 'var(--green)' : 'var(--text-3)' }}>
            {has ? 'measured' : assumeText}
          </span>
        )}
      </label>
      <input type="number" step="any" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'8px 11px', background:'var(--bg0)', border:`1.5px solid ${has && optional ? 'var(--green)' : 'var(--border)'}`, borderRadius:6, fontSize:13, fontFamily:'JetBrains Mono, monospace', color:'var(--text-1)', outline:'none' }} />
    </div>
  )
}

function Row2({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>{children}</div>
}

function RCard({ label, value, unit, sub, color = 'var(--blue)' }) {
  return (
    <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:10, padding:'13px 15px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color }} />
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--text-3)', marginBottom:5 }}>{label}</div>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:22, fontWeight:600, lineHeight:1, color }}>
        {value ?? '—'}{unit && <span style={{ fontSize:11, fontWeight:400, color:'var(--text-2)', marginLeft:3 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize:10, color:'var(--text-3)', marginTop:5, fontFamily:'JetBrains Mono, monospace' }}>{sub}</div>}
    </div>
  )
}

function Badge({ mode, text }) {
  const ok = mode === 'measured'
  return (
    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, padding:'3px 9px', borderRadius:10, border:'1px solid', background: ok ? 'var(--green-dim)' : 'rgba(139,148,158,0.1)', color: ok ? 'var(--green)' : 'var(--text-3)', borderColor: ok ? 'rgba(63,185,80,.25)' : 'rgba(139,148,158,.25)' }}>
      {text}
    </span>
  )
}

function WarnBox({ level, msg }) {
  const d = level === 'danger'
  return <div style={{ borderRadius:7, padding:'9px 13px', marginBottom:8, fontFamily:'JetBrains Mono, monospace', fontSize:12, border:'1px solid', background: d ? 'var(--red-dim)' : 'var(--amber-dim)', borderColor: d ? 'rgba(248,81,73,.25)' : 'rgba(210,153,34,.25)', color: d ? 'var(--red)' : 'var(--amber)' }}>⚠ {msg}</div>
}

function ErrBox({ msg }) {
  if (!msg) return null
  return <div style={{ background:'var(--red-dim)', border:'1px solid rgba(248,81,73,.3)', borderRadius:8, padding:'10px 14px', marginBottom:12, color:'var(--red)', fontFamily:'JetBrains Mono, monospace', fontSize:12 }}>⚠ {msg}</div>
}

function DetailTable({ sections }) {
  const [open, setOpen] = useState(true)
  const rows = []
  sections.forEach(sec => {
    rows.push({ type:'h', title:sec.title })
    sec.rows?.forEach(r => rows.push({ type:'r', ...r }))
  })
  return (
    <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:12 }}>
      <div onClick={() => setOpen(o => !o)} style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 14px', borderBottom: open ? '1px solid var(--border)' : 'none', background:'var(--bg2)', cursor:'pointer', userSelect:'none' }}>
        <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, fontWeight:700, background:'var(--green)', color:'#fff', width:20, height:20, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center' }}>≡</span>
        <span style={{ fontSize:13, fontWeight:500 }}>Detail</span>
        <span style={{ marginLeft:'auto', color:'var(--text-3)', transition:'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </div>
      {open && (
        <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono, monospace', fontSize:12 }}>
          <tbody>
            {rows.map((r, i) =>
              r.type === 'h'
                ? <tr key={i}><td colSpan={2} style={{ background:'var(--bg2)', color:'var(--text-3)', fontSize:9, textTransform:'uppercase', letterSpacing:'.8px', padding:'5px 16px', borderBottom:'1px solid var(--border)' }}>{r.title}</td></tr>
                : <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'7px 16px', color:'var(--text-2)', width:'60%' }}>{r.label}</td>
                    <td style={{ padding:'7px 16px', textAlign:'right', fontWeight:500, color: r.warn || 'var(--text-1)' }}>{r.value ?? '—'}</td>
                  </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

function CalcBtn({ color, onClick, loading, children }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ width:'100%', padding:13, border:'none', borderRadius:8, fontFamily:'JetBrains Mono, monospace', fontSize:14, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', margin:'4px 0 16px', background:color, color:'#fff', opacity: loading ? .6 : 1 }}>
      {loading ? '⏳ กำลังคำนวณ…' : children}
    </button>
  )
}

const g4  = { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:12 }
const g3  = { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }
const g2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }
const g3p = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }

// ─── Single-Stage ─────────────────────────────────────────────────────────────

function SingleStage() {
  const [f, setF] = useState({ cur:'', sp:'', dp:'', st:'', dt:'', lt:'' })
  const [res, setRes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const set = k => v => setF(p => ({ ...p, [k]:v }))

  async function calculate() {
    if (!f.cur || !f.sp || !f.dp) { setErr('กรุณากรอก I, SP และ DP'); return }
    setErr(null); setLoading(true)
    try {
      const { data } = await api.post('/api/calculate', {
        current:     +f.cur,
        sp:          +f.sp,
        dp:          +f.dp,
        st:          f.st !== '' ? +f.st : null,
        dt:          f.dt !== '' ? +f.dt : null,
        liquid_temp: f.lt !== '' ? +f.lt : null,
      })
      setRes(data)
    } catch (e) {
      setErr('เชื่อมต่อ backend ไม่ได้: ' + (e?.response?.data?.detail || e.message))
    } finally { setLoading(false) }
  }

  const p=res?.performance, sat=res?.saturation, enth=res?.enthalpy, m=res?.modes, inp=res?.inputs

  return (
    <div>
      <div style={g2}>
        <Panel>
          <PanelHead num="1" label="ข้อมูลจำเป็น" color="var(--blue)" />
          <div style={{ padding:15 }}>
            <Notice color="var(--blue)">V = 385 V · PF = 0.86 (fixed)</Notice>
            <Field label="Current · I" unit="A" value={f.cur} onChange={set('cur')} placeholder="เช่น 196" />
            <Row2>
              <Field label="SP" unit="kg/cm²g" value={f.sp} onChange={set('sp')} placeholder="เช่น 1.45" />
              <Field label="DP" unit="kg/cm²g" value={f.dp} onChange={set('dp')} placeholder="เช่น 14.10" />
            </Row2>
          </div>
        </Panel>
        <Panel>
          <PanelHead num="2" label="อุณหภูมิ (optional)" color="var(--green)" />
          <div style={{ padding:15 }}>
            <Field label="ST · Suction Temp"  unit="°C" value={f.st} onChange={set('st')} placeholder="assume SH=5K"    optional assumeText="assume SH=5K" />
            <Field label="DT · Discharge Temp" unit="°C" value={f.dt} onChange={set('dt')} placeholder="assume η=0.70"  optional assumeText="assume η=0.70" />
            <Field label="Liquid Temp"          unit="°C" value={f.lt} onChange={set('lt')} placeholder="assume SC=0"   optional assumeText="assume SC=0" />
          </div>
        </Panel>
      </div>

      <ErrBox msg={err} />
      <CalcBtn color="var(--blue)" onClick={calculate} loading={loading}>⚙ คำนวณ Single-Stage</CalcBtn>

      {res && (<>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          <Badge mode={m.sh_mode}  text={m.sh_mode  === 'measured' ? `ST=${fmt(m.st_used,1)}°C` : 'SH=5K (assume)'} />
          <Badge mode={m.dt_mode}  text={m.dt_mode  === 'measured' ? `DT=${fmt(m.dt_used,1)}°C` : 'η=0.70 (assume)'} />
          <Badge mode={m.liq_mode} text={m.liq_mode === 'measured' ? `SC=${fmt(sat.subcool,1)}K`  : 'SC=0 (assume)'} />
        </div>

        <div style={g4}>
          <RCard label="P_comp"      value={fmt(p.P_comp_kW)}   unit="kW"   sub={`${f.cur}A × 0.5728`}                           color="var(--blue)"  />
          <RCard label="COP"         value={fmt(p.COP,3)}                   sub={`SH ${fmt(sat.superheat,1)}K · SC ${fmt(sat.subcool,1)}K`} color="var(--green)" />
          <RCard label="Q_e Cooling" value={fmt(p.Q_e_kW)}      unit="kW"   sub={`${fmt(p.TR,1)} TR · Q_H=${fmt(p.Q_H_kW,1)}kW`} color="var(--amber)" />
          <RCard label="ṁ Mass Flow" value={fmt(p.m_dot_kgs,4)} unit="kg/s" sub={`${fmt(p.m_dot_kgh,1)} kg/h`}                   color="var(--cyan)"  />
        </div>

        {res.warnings.map((w,i) => <WarnBox key={i} level={w.level} msg={w.msg} />)}

        <DetailTable sections={[
          { title:'Conditions', rows:[
            { label:'ST used', value:`${fmt(m.st_used,1)} °C (${m.sh_mode})` },
            { label:'DT used', value:`${fmt(m.dt_used,1)} °C (${m.dt_mode})` },
          ]},
          { title:'Saturation (CoolProp / IIR)', rows:[
            { label:'T_evap · SP', value:`${fmt(sat.T_evap,2)} °C` },
            { label:'T_cond · DP', value:`${fmt(sat.T_cond,2)} °C` },
            { label:'Superheat', value:`${fmt(sat.superheat,2)} K`, warn: sat.superheat<0?'var(--red)':sat.superheat>25?'var(--amber)':null },
            { label:'Subcool',   value:`${fmt(sat.subcool,2)} K`,  warn: sat.subcool<0?'var(--red)':null },
            { label:'P_low',     value:`${fmt(inp.P_low_kPa,1)} kPa abs` },
            { label:'P_high',    value:`${fmt(inp.P_high_kPa,1)} kPa abs` },
          ]},
          { title:'Enthalpy [kJ/kg]', rows:[
            { label:'h1 · inlet',        value:fmt(enth.h1,2) },
            { label:'h2 · outlet',       value:fmt(enth.h2,2) },
            { label:'h2s · isentropic',  value:fmt(enth.h2s,2) },
            { label:'η_isentropic',      value: p.eta_isentropic!=null ? `${fmt(p.eta_isentropic,1)} %` : '—' },
            { label:'h3=h4 · condenser', value:fmt(enth.h3,2) },
          ]},
          { title:'Output', rows:[
            { label:'q_L = h1−h4',    value:`${fmt(p.q_L,2)} kJ/kg` },
            { label:'w_comp = h2−h1', value:`${fmt(p.w_comp,2)} kJ/kg` },
            { label:'Q_H',            value:`${fmt(p.Q_H_kW,2)} kW` },
            { label:'ṁ',              value:`${fmt(p.m_dot_kgh,1)} kg/h` },
          ]},
        ]} />
      </>)}
    </div>
  )
}

// ─── Two-Stage ────────────────────────────────────────────────────────────────

function TwoStage() {
  const [f, setF] = useState({ i_boost:'', sp:'', st:'', dt_b:'', t_int:'-7', i_high:'', dp:'', dt_h:'', lt:'' })
  const [res, setRes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const set = k => v => setF(p => ({ ...p, [k]:v }))

  async function calculate() {
    if (!f.i_boost || !f.sp || !f.i_high || !f.dp || !f.t_int) { setErr('กรุณากรอก I_booster, SP, I_high, DP, T_int'); return }
    setErr(null); setLoading(true)
    try {
      const { data } = await api.post('/api/calculate_two', {
        i_booster:   +f.i_boost,
        sp:          +f.sp,
        st:          f.st   !== '' ? +f.st   : null,
        dt_booster:  f.dt_b !== '' ? +f.dt_b : null,
        t_int:       +f.t_int,
        i_high:      +f.i_high,
        dp:          +f.dp,
        dt_high:     f.dt_h !== '' ? +f.dt_h : null,
        liquid_temp: f.lt   !== '' ? +f.lt   : null,
      })
      setRes(data)
    } catch (e) {
      setErr('เชื่อมต่อ backend ไม่ได้: ' + (e?.response?.data?.detail || e.message))
    } finally { setLoading(false) }
  }

  const p=res?.performance, sat=res?.saturation, enth=res?.enthalpy, m=res?.modes, pr=res?.pressures

  const steps = [
    { tag:'Low side',     name:'Evaporator',   color:'var(--blue)'   },
    { tag:'Low stage',    name:'Booster comp', color:'var(--blue)'   },
    { tag:'Intermediate', name:'Inter tank',   color:'var(--green)'  },
    { tag:'High stage',   name:'High comp',    color:'var(--purple)' },
    { tag:'High side',    name:'Condenser',    color:'var(--amber)'  },
  ]

  return (
    <div>
      {/* Cycle bar */}
      <div style={{ display:'flex', background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', marginBottom:20, fontFamily:'JetBrains Mono, monospace' }}>
        {steps.map((s,i) => (
          <div key={i} style={{ flex:1, padding:'9px 6px', textAlign:'center', borderRight: i<steps.length-1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize:9, color:'var(--text-3)', textTransform:'uppercase' }}>{s.tag}</div>
            <div style={{ fontSize:11, fontWeight:500, marginTop:2, color:s.color }}>{s.name}</div>
          </div>
        ))}
      </div>

      <div style={g3p}>
        <Panel>
          <PanelHead num="1" label="Low Stage · Booster" color="var(--blue)" />
          <div style={{ padding:15 }}>
            <Notice color="var(--blue)">V = 385V · PF = 0.86</Notice>
            <Field label="I_booster"        unit="A"       value={f.i_boost} onChange={set('i_boost')} placeholder="เช่น 200" />
            <Field label="SP"               unit="kg/cm²g" value={f.sp}      onChange={set('sp')}      placeholder="เช่น 0.5" />
            <Field label="ST · Suction Temp" unit="°C"     value={f.st}      onChange={set('st')}      placeholder="assume SH=5K" optional assumeText="assume SH=5K" />
            <Field label="DT_booster"        unit="°C"     value={f.dt_b}    onChange={set('dt_b')}    placeholder="assume η=0.70" optional assumeText="assume η=0.70" />
          </div>
        </Panel>

        <Panel>
          <PanelHead num="2" label="Intermediate (Inter tank)" color="var(--green)" />
          <div style={{ padding:15 }}>
            <Notice color="var(--green)">Closed intercooler<br/>booster → desuperheat → sat vapor T_int</Notice>
            <Field label="T_int · Inter tank temp" unit="°C" value={f.t_int} onChange={set('t_int')} placeholder="-7" />
            {res && (
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--text-3)', marginTop:8, lineHeight:1.7 }}>
                P_int = {fmt(pr?.P_int_kPa,1)} kPa abs<br/>
                = {fmt(pr?.P_int_kgcm2g,3)} kg/cm²g
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHead num="3" label="High Stage" color="var(--purple)" />
          <div style={{ padding:15 }}>
            <Notice color="var(--blue)">V = 385V · PF = 0.86</Notice>
            <Field label="I_high"    unit="A"       value={f.i_high} onChange={set('i_high')} placeholder="เช่น 430" />
            <Field label="DP"        unit="kg/cm²g" value={f.dp}     onChange={set('dp')}     placeholder="เช่น 12.3" />
            <Field label="DT_high"   unit="°C"      value={f.dt_h}   onChange={set('dt_h')}   placeholder="assume η=0.70" optional assumeText="assume η=0.70" />
            <Field label="Liquid Temp" unit="°C"    value={f.lt}     onChange={set('lt')}     placeholder="assume SC=0"   optional assumeText="assume SC=0" />
          </div>
        </Panel>
      </div>

      <ErrBox msg={err} />
      <CalcBtn color="var(--purple)" onClick={calculate} loading={loading}>⚙ คำนวณ Two-Stage</CalcBtn>

      {res && (<>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          <Badge mode={m.sh_mode}   text={m.sh_mode   === 'measured' ? `ST=${fmt(m.st_used,1)}°C`    : 'SH=5K (assume)'} />
          <Badge mode={m.dt_b_mode} text={m.dt_b_mode === 'measured' ? `DT_b=${fmt(m.dt_b_used,1)}°C` : 'η_b=0.70 (assume)'} />
          <Badge mode={m.dt_h_mode} text={m.dt_h_mode === 'measured' ? `DT_h=${fmt(m.dt_h_used,1)}°C` : 'η_h=0.70 (assume)'} />
          <Badge mode={m.liq_mode}  text={m.liq_mode  === 'measured' ? `SC=${fmt(sat.subcool,1)}K`    : 'SC=0 (assume)'} />
        </div>

        <div style={g4}>
          <RCard label="COP System"  value={fmt(p.COP_system,3)}  sub="Q_e / W_total"                                  color="var(--purple)" />
          <RCard label="Q_e Cooling" value={fmt(p.Q_e_kW,1)}      unit="kW" sub={`${fmt(p.Q_e_TR,1)} TR`}              color="var(--blue)"   />
          <RCard label="W_total"     value={fmt(p.W_total_kW,1)}  unit="kW" sub={`B ${fmt(p.W_booster_kW,1)} + H ${fmt(p.W_high_kW,1)}`} color="var(--amber)"  />
          <RCard label="Q_cond"      value={fmt(p.Q_cond_kW,1)}   unit="kW"                                             color="var(--purple)" />
        </div>
        <div style={g3}>
          <RCard label="W_booster" value={fmt(p.W_booster_kW,1)} unit="kW"   sub={`η=${fmt(p.eta_booster,1)}%`}         color="var(--blue)"   />
          <RCard label="W_high"    value={fmt(p.W_high_kW,1)}    unit="kW"   sub={`η=${fmt(p.eta_high,1)}%`}            color="var(--purple)" />
          <RCard label="ṁ_low / ṁ_high" value={`${fmt(p.m_low_kgh,0)} / ${fmt(p.m_high_kgh,0)}`} unit="kg/h" sub={`ratio = ${fmt(p.ratio_mh_ml,3)}`} color="var(--green)" />
        </div>

        {res.warnings.map((w,i) => <WarnBox key={i} level={w.level} msg={w.msg} />)}

        <DetailTable sections={[
          { title:'Pressures', rows:[
            { label:'P_low',                              value:`${fmt(pr.P_low_kPa,1)} kPa abs` },
            { label:`P_int · T_int=${fmt(sat.T_int,1)}°C`, value:`${fmt(pr.P_int_kPa,1)} kPa = ${fmt(pr.P_int_kgcm2g,3)} kg/cm²g` },
            { label:'P_high',                             value:`${fmt(pr.P_high_kPa,1)} kPa abs` },
          ]},
          { title:'Saturation (CoolProp / IIR)', rows:[
            { label:'T_evap · SP', value:`${fmt(sat.T_evap,2)} °C` },
            { label:'T_int',       value:`${fmt(sat.T_int,1)} °C`  },
            { label:'T_cond · DP', value:`${fmt(sat.T_cond,2)} °C` },
            { label:'Superheat', value:`${fmt(sat.superheat,2)} K`, warn: sat.superheat<0?'var(--red)':sat.superheat>25?'var(--amber)':null },
            { label:'Subcool',   value:`${fmt(sat.subcool,2)} K`,  warn: sat.subcool<0?'var(--red)':null },
          ]},
          { title:'Enthalpy [kJ/kg]', rows:[
            { label:'h1 · Booster inlet',     value:fmt(enth.h1,2) },
            { label:'h2 · Booster outlet',    value:fmt(enth.h2,2) },
            { label:'h2s · isentropic',       value:fmt(enth.h2s_b,2) },
            { label:'η_booster',              value: p.eta_booster!=null ? `${fmt(p.eta_booster,1)} %` : '—' },
            { label:'h3 · Inter tank (sat vap)', value:fmt(enth.h3,2) },
            { label:'h4 · High outlet',       value:fmt(enth.h4,2) },
            { label:'h4s · isentropic',       value:fmt(enth.h4s,2) },
            { label:'η_high',                 value: p.eta_high!=null ? `${fmt(p.eta_high,1)} %` : '—' },
            { label:'h5 · Condenser',         value:fmt(enth.h5,2) },
            { label:'h6=h5 · EXV→inter',      value:fmt(enth.h6,2) },
            { label:'hf_int · sat liq P_int', value:fmt(enth.hf_int,2) },
            { label:'h7=hf_int · EXV→evap',  value:fmt(enth.h7,2) },
          ]},
          { title:'Mass flow', rows:[
            { label:'ṁ_low',       value:`${fmt(p.m_low_kgh,1)} kg/h` },
            { label:'ṁ_high',      value:`${fmt(p.m_high_kgh,1)} kg/h` },
            { label:'m_high/m_low', value:fmt(p.ratio_mh_ml,4) },
          ]},
        ]} />
      </>)}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const [tab, setTab] = useState('single')

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg0)' }}>
      <Navbar />
      <div style={{ maxWidth:1080, margin:'0 auto', padding:'24px 20px 80px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:600, fontFamily:'JetBrains Mono, monospace', color:'var(--text-1)', margin:0 }}>
              NH₃ Refrigeration Calculator
            </h1>
            <p style={{ fontSize:12, color:'var(--text-3)', marginTop:3, fontFamily:'JetBrains Mono, monospace' }}>
              Powered by CoolProp / IIR 
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {[['single','Single-stage'],['two','Two-stage']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, padding:'7px 18px', borderRadius:7, cursor:'pointer', border:`1px solid ${tab===id?'transparent':'var(--border)'}`, background: tab===id?'var(--blue-dim)':'transparent', color: tab===id?'var(--blue)':'var(--text-2)', fontWeight: tab===id?600:400 }}>
                {label}
              </button>
            ))}
          </div>
        </div>

      

        {tab === 'single' ? <SingleStage /> : <TwoStage />}
      </div>
    </div>
  )
}