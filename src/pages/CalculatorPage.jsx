import { useState, useRef } from 'react'
import Sidebar from '../components/layout/Sidebar'
import {
  Panel, PanelHead, Notice, Field, Row2, RCard, Badge,
  WarnBox, ErrBox, DetailTable, CalcBtn,
  g2, g3, g3p, g4,
} from '../components/calculator/CalcUI'
import api from '../services/api'
import { Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS, LinearScale, LogarithmicScale,
  PointElement, LineElement, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(LinearScale, LogarithmicScale, PointElement, LineElement, Tooltip, Legend)

// ─── Local cycle builders (reshape BE response → chart format) ────────────────
// ไม่มี thermodynamics — แค่ map field จาก API response ที่ backend คำนวณมาแล้ว

function buildCycleFromSingle(res) {
  const { enthalpy, inputs, modes, saturation } = res
  const pL = inputs.P_low_kPa  / 1000   // MPa
  const pH = inputs.P_high_kPa / 1000
  // h4 = h3 (isenthalpic expansion valve) — backend อาจไม่ส่ง h4 มาแยก
  const h4 = enthalpy.h4 ?? enthalpy.h3
  return {
    point1:  { h: enthalpy.h1,  p: pL, label: '1 — Comp. inlet',  t_c: modes?.st_used  ?? null },
    point2:  { h: enthalpy.h2,  p: pH, label: '2 — Comp. outlet', t_c: modes?.dt_used  ?? null },
    point2s: { h: enthalpy.h2s, p: pH, label: '2s — Isentropic'                                },
    point3:  { h: enthalpy.h3,  p: pH, label: '3 — Cond. outlet', t_c: saturation?.T_cond ?? null },
    point4:  { h: h4,           p: pL, label: '4 — Evap. inlet'                                },
    isentropic_efficiency: res.performance?.eta_isentropic != null
      ? res.performance.eta_isentropic / 100 : null,
  }
}

function buildCycleFromTwo(res) {
  const { enthalpy, pressures } = res
  const pL = pressures.P_low_kPa  / 1000
  const pI = pressures.P_int_kPa  / 1000
  const pH = pressures.P_high_kPa / 1000
  return {
    point1: { h: enthalpy.h1, p: pL, label: '1 — Booster inlet'    },
    point2: { h: enthalpy.h2, p: pI, label: '2 — Booster outlet'   },
    point3: { h: enthalpy.h3, p: pI, label: '3 — Inter tank exit'  },
    point4: { h: enthalpy.h4, p: pH, label: '4 — High comp outlet' },
    point5: { h: enthalpy.h5, p: pH, label: '5 — Cond. outlet'     },
    point6: { h: enthalpy.h6, p: pI, label: '6 — EXV→inter'        },
    point7: { h: enthalpy.h7, p: pL, label: '7 — EXV→evap'         },
    isentropic_efficiency: null,
  }
}

const fmt = (v, d = 2) => (v != null && !isNaN(Number(v)) ? Number(v).toFixed(d) : '—')

// ─── Saturation dome cache (fetch จาก backend ครั้งเดียว) ────────────────────
let _domeCache = null

async function fetchDome() {
  if (_domeCache) return _domeCache
  try {
    const res = await api.get('/api/ph-diagram/COMP-01')
    _domeCache = res.data?.saturation_dome ?? null
  } catch { _domeCache = null }
  return _domeCache
}

// ─── PH Mini Chart ───────────────────────────────────────────────────────────

/**
 * PHMiniChart — รับ cycle object จาก buildCycleFromSingle/Two
 * แสดง P-H diagram แบบ inline ใต้ผลการคำนวณ
 * isTwo = true → แสดง path 7 จุดของ two-stage cycle
 */
function PHMiniChart({ cycle, dome, isTwo = false }) {
  const chartRef = useRef(null)

  // cycle points สำหรับ single-stage: 1→2→3→4→1
  // two-stage: 1→2→3→4→5→6→7→1 (low side: 1→2→3→6→7→1, high side: 3→4→5→6)
  const cyclePoints = isTwo
    ? [cycle.point1, cycle.point2, cycle.point3, cycle.point4,
       cycle.point5, cycle.point6, cycle.point7, cycle.point1].filter(Boolean)
    : [cycle.point1, cycle.point2, cycle.point3, cycle.point4, cycle.point1].filter(Boolean)

  // x-range: pad 15% รอบค่า h ทั้งหมด
  const allH = cyclePoints.map(p => p.h).filter(v => v != null && !isNaN(v) && v !== 0)
  const hMin = Math.min(...allH), hMax = Math.max(...allH)
  const pad  = (hMax - hMin) * 0.18
  const xMin = Math.floor(hMin - pad)
  const xMax = Math.ceil(hMax + pad)

  // y-range: focus บน operating cycle (ไม่ใช้ full dome ทั้งหมด — จะบีบ cycle ให้เล็ก)
  const allP = cyclePoints.map(p => p.p).filter(v => v != null && !isNaN(v) && v > 0)
  const pMin = Math.min(...allP), pMax = Math.max(...allP)
  const yMin = +(pMin * 0.55).toFixed(3)  // ต่ำกว่า P_low 45%
  const yMax = +(pMax * 3.5).toFixed(1)   // สูงกว่า P_high 3.5× เพื่อให้ dome ยังมองเห็น

  const datasets = [
    {
      label: 'Sat. liquid',
      data: (dome?.liquid ?? []).map(p => ({ x: p.h, y: p.p })),
      borderColor: '#39c5cf', backgroundColor: 'rgba(57,197,207,0.06)',
      borderWidth: 1.5, showLine: true, tension: 0.3, pointRadius: 0, fill: false,
    },
    {
      label: 'Sat. vapour',
      data: (dome?.vapour ?? []).map(p => ({ x: p.h, y: p.p })),
      borderColor: '#39c5cf', backgroundColor: 'transparent',
      borderWidth: 1.5, showLine: true, tension: 0.3, pointRadius: 0,
    },
    {
      label: 'Cycle',
      data: cyclePoints.map(p => ({ x: p.h, y: p.p })),
      borderColor: '#f0883e', backgroundColor: '#f0883e',
      borderWidth: 2.5, showLine: true, tension: 0,
      // จุด 1 และ 2 ใหญ่กว่า เพราะอยู่ชิดหรือเลยขอบ dome
      pointRadius: cyclePoints.map((_, i) => {
        if (i >= cyclePoints.length - 1) return 0  // closing point
        return (i === 0 || i === 1) ? 7 : 5
      }),
      pointBackgroundColor: cyclePoints.map((_, i) =>
        (i === 0 || i === 1) ? '#fff' : '#f0883e'
      ),
      pointBorderColor: '#f0883e', pointBorderWidth: 2,
    },
  ]

  // isentropic line (2s point) — single-stage only
  if (!isTwo && cycle.point2s && cycle.point1) {
    datasets.push({
      label: 'Isentropic',
      data: [
        { x: cycle.point1.h, y: cycle.point1.p },
        { x: cycle.point2s.h, y: cycle.point2s.p },
      ],
      borderColor: 'rgba(240,136,62,0.5)',
      borderWidth: 1.5,
      showLine: true, pointRadius: 0,
    })
  }

  const options = {
    responsive: true, maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        type: 'linear', min: xMin, max: xMax,
        title: { display: true, text: 'h  [kJ/kg]', color: 'var(--text-3)', font: { size: 11 } },
        grid:  { color: 'rgba(139,148,158,0.1)' },
        ticks: { color: 'var(--text-3)', font: { size: 10 } },
      },
      y: {
        type: 'logarithmic',
        min: yMin, max: yMax,
        title: { display: true, text: 'P  [MPa]', color: 'var(--text-3)', font: { size: 11 } },
        grid:  { color: 'rgba(139,148,158,0.1)' },
        ticks: { color: 'var(--text-3)', font: { size: 10 },
          callback: v => {
            const nice = [0.1, 0.2, 0.3, 0.5, 1, 1.5, 2, 3, 5, 7, 10]
            return nice.some(n => Math.abs(v - n) / n < 0.05) ? v.toFixed(v < 1 ? 2 : 1) : ''
          },
        },
      },
    },
    plugins: {
      legend: {
        labels: { color: 'var(--text-2)', font: { size: 11 }, boxWidth: 12, padding: 10 },
      },
      tooltip: {
        callbacks: {
          label: ctx => {
            const pt = cyclePoints[ctx.dataIndex]
            const base = `h=${ctx.parsed.x.toFixed(1)} kJ/kg  P=${ctx.parsed.y.toFixed(3)} MPa`
            return pt?.label ? `${pt.label}  |  ${base}` : base
          },
        },
      },
    },
  }

  // Point labels วาดบน canvas
  const pointLabelPlugin = {
    id: 'pointLabels',
    afterDraw(chart) {
      const meta = chart.getDatasetMeta(2)
      if (!meta?.data) return
      const ctx2 = chart.ctx
      ctx2.save()
      ctx2.font = '10px JetBrains Mono, monospace'
      ctx2.fillStyle = '#f0883e'
      ctx2.textAlign = 'center'
      meta.data.forEach((el, i) => {
        const pt = cyclePoints[i]
        if (!pt || i >= cyclePoints.length - 1) return
        const num = i + 1
        ctx2.fillText(num, el.x, el.y - 10)
      })
      ctx2.restore()
    },
  }

  return (
    <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)' }}>
        <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, fontWeight:700, background:'var(--cyan)', color:'#0d1117', width:20, height:20, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>PH</span>
        <span style={{ fontSize:13, fontWeight:500 }}>P-H Diagram</span>
        <span style={{ marginLeft:'auto', fontSize:10, color:'var(--text-3)', fontFamily:'JetBrains Mono, monospace' }}>คำนวณจาก NH₃ table (client-side)</span>
      </div>
      <div style={{ padding:16 }}>
        <div style={{ height: 300 }}>
          <Scatter ref={chartRef} data={{ datasets }} options={options} plugins={[pointLabelPlugin]} />
        </div>
        {/* Cycle point cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:8, marginTop:12 }}>
          {cyclePoints.slice(0, -1).map((pt, i) => pt && (
            <div key={i} style={{ background:'var(--bg0)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px' }}>
              <div style={{ fontSize:9, fontWeight:700, color:'#f0883e', marginBottom:4, letterSpacing:'0.05em' }}>Point {i+1}</div>
              <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:2, lineHeight:1.3 }}>{pt.label}</div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--text-1)' }}>h = {pt.h?.toFixed(1)} kJ/kg</div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--text-1)' }}>P = {pt.p?.toFixed(3)} MPa</div>
              {pt.t_c != null && <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--text-2)' }}>T = {Number(pt.t_c).toFixed(1)} °C</div>}
            </div>
          ))}
        </div>
        {cycle.isentropic_efficiency != null && (
          <div style={{ marginTop:10, fontSize:11, color:'var(--text-2)', fontFamily:'JetBrains Mono, monospace' }}>
            Isentropic efficiency:&nbsp;
            <span style={{ color:'var(--cyan)', fontWeight:600 }}>
              {(cycle.isentropic_efficiency * 100).toFixed(1)} %
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Single-Stage ─────────────────────────────────────────────────────────────

function SingleStage() {
  const [f, setF] = useState({ cur:'', sp:'', dp:'', st:'', dt:'', lt:'' })
  const [res, setRes] = useState(null)
  const [dome, setDome] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const set = k => v => setF(p => ({ ...p, [k]:v }))

  async function calculate() {
    if (!f.cur || !f.sp || !f.dp) { setErr('กรุณากรอก I, SP และ DP'); return }
    setErr(null); setLoading(true)
    try {
      const [{ data }, d] = await Promise.all([
        api.post('/api/calculate', {
          current:     +f.cur,
          sp:          +f.sp,
          dp:          +f.dp,
          st:          f.st !== '' ? +f.st : null,
          dt:          f.dt !== '' ? +f.dt : null,
          liquid_temp: f.lt !== '' ? +f.lt : null,
        }),
        fetchDome(),
      ])
      setRes(data)
      setDome(d)
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

        <PHMiniChart cycle={buildCycleFromSingle(res)} dome={dome} />

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
  const [dome, setDome] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const set = k => v => setF(p => ({ ...p, [k]:v }))

  async function calculate() {
    if (!f.i_boost || !f.sp || !f.i_high || !f.dp || !f.t_int) { setErr('กรุณากรอก I_booster, SP, I_high, DP, T_int'); return }
    setErr(null); setLoading(true)
    try {
      const [{ data }, d] = await Promise.all([
        api.post('/api/calculate_two', {
          i_booster:   +f.i_boost,
          sp:          +f.sp,
          st:          f.st   !== '' ? +f.st   : null,
          dt_booster:  f.dt_b !== '' ? +f.dt_b : null,
          t_int:       +f.t_int,
          i_high:      +f.i_high,
          dp:          +f.dp,
          dt_high:     f.dt_h !== '' ? +f.dt_h : null,
          liquid_temp: f.lt   !== '' ? +f.lt   : null,
        }),
        fetchDome(),
      ])
      setRes(data)
      setDome(d)
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

        <PHMiniChart cycle={buildCycleFromTwo(res)} dome={dome} isTwo />

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

// ─── Formulas Reference ───────────────────────────────────────────────────────

function FormulaBlock({ label, formula, unit, note }) {
  return (
    <div style={{ background:'var(--bg0)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', marginBottom:8 }}>
      <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:13, color:'var(--cyan)', fontWeight:600 }}>{formula}</div>
      {unit && <div style={{ fontSize:10, color:'var(--text-3)', marginTop:3 }}>หน่วย: {unit}</div>}
      {note && <div style={{ fontSize:11, color:'var(--text-2)', marginTop:5, lineHeight:1.6 }}>{note}</div>}
    </div>
  )
}

function FormulaSection({ title, color='var(--blue)', children }) {
  return (
    <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:10, marginBottom:14, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }} />
        <span style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{title}</span>
      </div>
      <div style={{ padding:'12px 14px' }}>{children}</div>
    </div>
  )
}

function FormulasTab() {
  return (
    <div>
      <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>
        สูตรทั้งหมดด้านล่างนี้ใช้ใน Calculator ทั้ง Single-stage และ Two-stage
        ค่า thermodynamic properties (h, T_sat, ฯลฯ) คำนวณโดย <span style={{ color:'var(--cyan)', fontFamily:'JetBrains Mono, monospace' }}>CoolProp</span> / <span style={{ color:'var(--cyan)', fontFamily:'JetBrains Mono, monospace' }}>IIR tables</span> ฝั่ง backend
      </div>

      <FormulaSection title="1 · กำลังไฟฟ้าคอมเพรสเซอร์" color="var(--blue)">
        <FormulaBlock
          label="กำลังไฟ 3-phase"
          formula="P_comp = √3 × V × I × PF"
          unit="W → หาร 1000 → kW"
          note="V = 385 V (fixed), PF = 0.86 (fixed) ∴ P_comp [kW] = I × √3 × 385 × 0.86 / 1000 ≈ I × 0.5728"
        />
      </FormulaSection>

      <FormulaSection title="2 · แรงดันสัมบูรณ์ (Absolute Pressure)" color="var(--green)">
        <FormulaBlock
          label="แปลงจาก gauge เป็น absolute"
          formula="P_abs [kPa] = (P_gauge [kg/cm²g] + 1.0332) × 98.0665"
          unit="kPa"
          note="1 kg/cm²g = 98.0665 kPa | 1 atm = 1.0332 kg/cm²"
        />
      </FormulaSection>

      <FormulaSection title="3 · อุณหภูมิอิ่มตัวและ Superheat / Subcool" color="var(--cyan)">
        <FormulaBlock
          label="อุณหภูมิอิ่มตัว (saturation)"
          formula="T_sat = T_sat_NH₃(P_abs)  [CoolProp]"
          note="T_evap = T_sat(P_low), T_cond = T_sat(P_high)"
        />
        <FormulaBlock
          label="Superheat (ความร้อนยวดยิ่ง)"
          formula="SH = T_suction − T_evap"
          unit="K"
          note="ถ้าไม่กรอก ST จะ assume SH = 5 K → ST = T_evap + 5"
        />
        <FormulaBlock
          label="Subcooling (ความเย็นต่ำกว่าอิ่มตัว)"
          formula="SC = T_cond − T_liquid"
          unit="K"
          note="ถ้าไม่กรอก Liquid Temp จะ assume SC = 0 → h3 = hf(P_high)"
        />
      </FormulaSection>

      <FormulaSection title="4 · Enthalpy ณ จุดต่างๆ (Single-Stage)" color="var(--purple)">
        <FormulaBlock
          label="h1 — Compressor inlet (superheated vapor)"
          formula="h1 = h_NH₃(P_low, T_suction)"
          note="จาก CoolProp ใช้ pressure + temperature → enthalpy"
        />
        <FormulaBlock
          label="h2s — Isentropic discharge (ideal)"
          formula="h2s = h_NH₃(P_high, s=s1)"
          note="entropy ที่ inlet = entropy ที่ outlet ในกระบวนการ isentropic"
        />
        <FormulaBlock
          label="h2 — Actual discharge"
          formula="h2 = h1 + (h2s − h1) / η_is"
          note="η_is = isentropic efficiency · ถ้าไม่กรอก DT จะ assume η_is = 0.70"
        />
        <FormulaBlock
          label="h3 — Condenser outlet (subcooled liquid)"
          formula="h3 = hf(P_high) − SC × Cp_liq"
          note="ถ้า SC=0 → h3 = hf(T_cond)"
        />
        <FormulaBlock
          label="h4 — Evaporator inlet (after expansion valve)"
          formula="h4 = h3  (isenthalpic process)"
          note="Expansion valve = กระบวนการ isenthalpic: enthalpy คงที่"
        />
      </FormulaSection>

      <FormulaSection title="5 · สมรรถนะระบบ (Single-Stage)" color="var(--amber)">
        <FormulaBlock
          label="Specific cooling effect"
          formula="q_L = h1 − h4"
          unit="kJ/kg"
        />
        <FormulaBlock
          label="Specific compressor work"
          formula="w_comp = h2 − h1"
          unit="kJ/kg"
        />
        <FormulaBlock
          label="Mass flow rate"
          formula="ṁ = P_comp / w_comp"
          unit="kg/s → ×3600 → kg/h"
        />
        <FormulaBlock
          label="Cooling capacity"
          formula="Q_e = ṁ × q_L = ṁ × (h1 − h4)"
          unit="kW  |  TR = kW / 3.517"
        />
        <FormulaBlock
          label="Heat rejection (condenser)"
          formula="Q_H = ṁ × (h2 − h3)"
          unit="kW"
          note="ตรวจสอบ: Q_H = Q_e + P_comp (energy balance)"
        />
        <FormulaBlock
          label="COP — Coefficient of Performance"
          formula="COP = Q_e / P_comp = q_L / w_comp"
          note="COP ยิ่งสูงยิ่งดี (ประหยัดพลังงาน)"
        />
      </FormulaSection>

      <FormulaSection title="6 · Two-Stage — Inter-tank & Mass Flow Balance" color="var(--purple)">
        <FormulaBlock
          label="h3 — Inter-tank exit (saturated vapor @ P_int)"
          formula="h3 = hg(T_int)"
          note="Closed intercooler: booster discharge desuperheated → saturated vapor ที่อุณหภูมิ T_int"
        />
        <FormulaBlock
          label="Mass flow balance at inter-tank"
          formula="ṁ_high × h3 = ṁ_low × h2 + (ṁ_high − ṁ_low) × hf_int"
          note="ṁ_high / ṁ_low = (h3 − hf_int) / (h2 − hf_int)  →  หา ṁ_high จาก ṁ_low"
        />
        <FormulaBlock
          label="ṁ_low (low-stage mass flow)"
          formula="ṁ_low = P_booster / w_booster = P_booster / (h2 − h1)"
          unit="kg/s"
        />
        <FormulaBlock
          label="COP ระบบรวม"
          formula="COP_system = Q_e / W_total = (ṁ_low × q_L) / (W_booster + W_high)"
          note="W_total = W_booster + W_high"
        />
      </FormulaSection>

      <FormulaSection title="7 · หน่วยและค่าคงที่ที่ใช้" color="var(--text-3)">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:8 }}>
          {[
            ['V (Supply voltage)', '385 V (3-phase)'],
            ['PF (Power factor)', '0.86'],
            ['1 TR (Ton of Refrigeration)', '3.517 kW'],
            ['1 kg/cm²', '98.0665 kPa'],
            ['1 atm', '101.325 kPa = 1.0332 kg/cm²'],
            ['Refrigerant', 'NH₃ (R-717)'],
            ['Default SH (assume)', '5 K'],
            ['Default η_is (assume)', '0.70 (70%)'],
            ['Default SC (assume)', '0 K'],
            ['Default T_int (Two-stage)', '−7 °C'],
          ].map(([k, v]) => (
            <div key={k} style={{ background:'var(--bg0)', border:'1px solid var(--border)', borderRadius:7, padding:'8px 12px' }}>
              <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:2 }}>{k}</div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--text-1)', fontWeight:600 }}>{v}</div>
            </div>
          ))}
        </div>
      </FormulaSection>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const [tab, setTab] = useState('single')

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg0)' }}>
      <Sidebar />
      <div style={{ flex:1, minWidth:0, padding:'24px 20px 80px' }}>

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
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[['single','Single-stage','var(--blue)'],['two','Two-stage','var(--purple)'],['formulas','Formulas','var(--cyan)']].map(([id, label, color]) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, padding:'7px 18px', borderRadius:7, cursor:'pointer',
                  border:`1px solid ${tab===id ? 'transparent' : 'var(--border)'}`,
                  background: tab===id ? color+'22' : 'transparent',
                  color: tab===id ? color : 'var(--text-2)',
                  fontWeight: tab===id ? 600 : 400 }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'single'   && <SingleStage />}
        {tab === 'two'      && <TwoStage />}
        {tab === 'formulas' && <FormulasTab />}
      </div>
    </div>
  )
}