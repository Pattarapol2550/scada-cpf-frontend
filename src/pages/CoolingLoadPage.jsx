import { useMemo, useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import {
  Panel, PanelHead, Notice, Field, Row2, RCard,
  ErrBox, DetailTable, CalcBtn,
} from '../components/calculator/CalcUI'

const fmt = (v, d = 2) => (Number.isFinite(Number(v)) ? Number(v).toFixed(d) : '-')
const toNum = v => (v === '' || v == null ? 0 : Number(v))
const positive = v => Number.isFinite(Number(v)) && Number(v) > 0

const grid2 = { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:14, marginBottom:14 }
const grid3 = { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:10, marginBottom:12 }
const sectionNote = { fontSize:11, color:'var(--text-3)', marginTop:8, lineHeight:1.6, fontFamily:'JetBrains Mono, monospace' }

function calcProductLoad(f) {
  const mass = toNum(f.massKg)
  const hours = toNum(f.pullDownHours)
  if (!mass || !hours) return { sensibleAbove:0, latent:0, sensibleBelow:0, total:0 }

  const initial = toNum(f.initialTempC)
  const final = toNum(f.finalTempC)
  const freeze = toNum(f.freezingTempC)
  const cpAbove = toNum(f.cpAbove)
  const cpBelow = toNum(f.cpBelow)
  const latentHeat = toNum(f.latentHeat)
  const seconds = hours * 3600

  const sensibleAboveKj = Math.max(initial - Math.max(final, freeze), 0) * cpAbove * mass
  const crossesFreeze = initial > freeze && final < freeze
  const latentKj = crossesFreeze ? latentHeat * mass : 0
  const sensibleBelowKj = Math.max(freeze - final, 0) * cpBelow * mass

  return {
    sensibleAbove: sensibleAboveKj / seconds,
    latent: latentKj / seconds,
    sensibleBelow: sensibleBelowKj / seconds,
    total: (sensibleAboveKj + latentKj + sensibleBelowKj) / seconds,
  }
}

export default function CoolingLoadPage() {
  const [f, setF] = useState({
    massKg:'1000',
    initialTempC:'25',
    finalTempC:'-18',
    freezingTempC:'-1',
    pullDownHours:'12',
    cpAbove:'3.7',
    cpBelow:'1.9',
    latentHeat:'250',
    roomLoadKw:'',
    transmissionKw:'',
    fanKw:'',
    peopleKw:'',
    miscKw:'',
    motorPowerKw:'',
    motorCurrentA:'',
    voltageV:'385',
    powerFactor:'0.86',
    phases:'3',
  })
  const [calculated, setCalculated] = useState(false)
  const [err, setErr] = useState(null)
  const set = k => v => setF(p => ({ ...p, [k]:v }))

  const result = useMemo(() => {
    const product = calcProductLoad(f)
    const roomLoad = toNum(f.roomLoadKw)
    const transmission = toNum(f.transmissionKw)
    const fan = toNum(f.fanKw)
    const people = toNum(f.peopleKw)
    const misc = toNum(f.miscKw)
    const auxLoad = roomLoad + transmission + fan + people + misc
    const totalCoolingKw = product.total + auxLoad

    const directPower = toNum(f.motorPowerKw)
    const phaseFactor = String(f.phases).trim() === '1' ? 1 : Math.sqrt(3)
    const currentPower = positive(f.motorCurrentA)
      ? phaseFactor * toNum(f.voltageV) * toNum(f.motorCurrentA) * toNum(f.powerFactor) / 1000
      : 0
    const inputPowerKw = directPower || currentPower
    const cop = inputPowerKw > 0 ? totalCoolingKw / inputPowerKw : null
    const tr = totalCoolingKw / 3.517

    return { product, auxLoad, totalCoolingKw, inputPowerKw, cop, tr, currentPower }
  }, [f])

  function calculate() {
    if (!positive(f.massKg) || !positive(f.pullDownHours)) {
      setErr('กรุณากรอก Mass และ Pull-down time ให้มากกว่า 0')
      setCalculated(false)
      return
    }
    if (toNum(f.initialTempC) <= toNum(f.finalTempC)) {
      setErr('Initial temp ต้องมากกว่า Final temp')
      setCalculated(false)
      return
    }
    if (!positive(f.motorPowerKw) && !positive(f.motorCurrentA)) {
      setErr('กรุณากรอก Electrical input อย่างน้อย Motor power หรือ Current เพื่อคำนวณ COP')
      setCalculated(false)
      return
    }
    setErr(null)
    setCalculated(true)
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg0)' }}>
      <Sidebar />
      <main style={{ flex:1, minWidth:0, padding:'24px 20px 80px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:600, fontFamily:'JetBrains Mono, monospace', color:'var(--text-1)', margin:0 }}>
              Cooling Load & COP
            </h1>
            <p style={{ fontSize:12, color:'var(--text-3)', marginTop:3, fontFamily:'JetBrains Mono, monospace' }}>
              Product load + room load / electrical input
            </p>
          </div>
        </div>

        <div style={grid2}>
          <Panel>
            <PanelHead num="1" label="Product Cooling Load" color="var(--blue)" />
            <div style={{ padding:15 }}>
              <Notice color="var(--blue)">Q = m Cp ΔT / time และ latent load เมื่ออุณหภูมิข้ามจุดเยือกแข็ง</Notice>
              <Row2>
                <Field label="Mass" unit="kg" value={f.massKg} onChange={set('massKg')} placeholder="1000" />
                <Field label="Pull-down time" unit="hr" value={f.pullDownHours} onChange={set('pullDownHours')} placeholder="12" />
              </Row2>
              <Row2>
                <Field label="Initial temp" unit="°C" value={f.initialTempC} onChange={set('initialTempC')} placeholder="25" />
                <Field label="Final temp" unit="°C" value={f.finalTempC} onChange={set('finalTempC')} placeholder="-18" />
              </Row2>
              <Field label="Freezing temp" unit="°C" value={f.freezingTempC} onChange={set('freezingTempC')} placeholder="-1" />
            </div>
          </Panel>

          <Panel>
            <PanelHead num="2" label="Product Properties" color="var(--green)" />
            <div style={{ padding:15 }}>
              <Notice color="var(--green)">ค่า default เป็นค่าประมาณสำหรับอาหารทั่วไป ปรับตาม product จริงได้</Notice>
              <Row2>
                <Field label="Cp above freezing" unit="kJ/kg.K" value={f.cpAbove} onChange={set('cpAbove')} placeholder="3.7" />
                <Field label="Cp below freezing" unit="kJ/kg.K" value={f.cpBelow} onChange={set('cpBelow')} placeholder="1.9" />
              </Row2>
              <Field label="Latent heat" unit="kJ/kg" value={f.latentHeat} onChange={set('latentHeat')} placeholder="250" />
              <div style={sectionNote}>ถ้า Final temp ไม่ต่ำกว่า Freezing temp ระบบจะไม่รวม latent และ sensible below freezing</div>
            </div>
          </Panel>
        </div>

        <div style={grid2}>
          <Panel>
            <PanelHead num="3" label="Room / Auxiliary Load" color="var(--amber)" />
            <div style={{ padding:15 }}>
              <Row2>
                <Field label="Known room load" unit="kW" value={f.roomLoadKw} onChange={set('roomLoadKw')} placeholder="optional" optional assumeText="0 kW" />
                <Field label="Transmission" unit="kW" value={f.transmissionKw} onChange={set('transmissionKw')} placeholder="optional" optional assumeText="0 kW" />
              </Row2>
              <Row2>
                <Field label="Fan / evaporator" unit="kW" value={f.fanKw} onChange={set('fanKw')} placeholder="optional" optional assumeText="0 kW" />
                <Field label="People / door" unit="kW" value={f.peopleKw} onChange={set('peopleKw')} placeholder="optional" optional assumeText="0 kW" />
              </Row2>
              <Field label="Misc load" unit="kW" value={f.miscKw} onChange={set('miscKw')} placeholder="optional" optional assumeText="0 kW" />
            </div>
          </Panel>

          <Panel>
            <PanelHead num="4" label="Electrical Input for COP" color="var(--purple)" />
            <div style={{ padding:15 }}>
              <Field label="Motor power" unit="kW" value={f.motorPowerKw} onChange={set('motorPowerKw')} placeholder="ใช้ค่านี้ก่อน ถ้ามี" optional assumeText="use current" />
              <Row2>
                <Field label="Current" unit="A" value={f.motorCurrentA} onChange={set('motorCurrentA')} placeholder="196" optional assumeText="optional" />
                <Field label="Voltage" unit="V" value={f.voltageV} onChange={set('voltageV')} placeholder="385" />
              </Row2>
              <Row2>
                <Field label="Power factor" value={f.powerFactor} onChange={set('powerFactor')} placeholder="0.86" />
                <Field label="Phases" value={f.phases} onChange={set('phases')} placeholder="3" />
              </Row2>
              <div style={sectionNote}>ถ้าไม่กรอก Motor power จะคำนวณจาก V × I × PF และใช้ √3 เพิ่มเมื่อเป็น 3-phase</div>
            </div>
          </Panel>
        </div>

        <ErrBox msg={err} />
        <CalcBtn color="var(--blue)" onClick={calculate} loading={false}>คำนวณ Cooling Load & COP</CalcBtn>

        {calculated && (
          <>
            <div style={grid3}>
              <RCard label="Product load" value={fmt(result.product.total)} unit="kW" sub={`${fmt(result.product.total / 3.517, 2)} TR`} color="var(--blue)" />
              <RCard label="Aux load" value={fmt(result.auxLoad)} unit="kW" sub="room + transmission + fan + misc" color="var(--amber)" />
              <RCard label="Total cooling" value={fmt(result.totalCoolingKw)} unit="kW" sub={`${fmt(result.tr, 2)} TR`} color="var(--green)" />
              <RCard label="Input power" value={fmt(result.inputPowerKw)} unit="kW" sub={positive(f.motorPowerKw) ? 'manual motor power' : `${fmt(result.currentPower)} kW from current`} color="var(--purple)" />
              <RCard label="COP" value={fmt(result.cop, 3)} sub="Cooling kW / Input kW" color="var(--cyan)" />
            </div>

            <DetailTable sections={[
              { title:'Product load breakdown', rows:[
                { label:'Sensible above freezing', value:`${fmt(result.product.sensibleAbove)} kW` },
                { label:'Latent freezing load', value:`${fmt(result.product.latent)} kW` },
                { label:'Sensible below freezing', value:`${fmt(result.product.sensibleBelow)} kW` },
                { label:'Total product load', value:`${fmt(result.product.total)} kW` },
              ]},
              { title:'Auxiliary load', rows:[
                { label:'Known room load', value:`${fmt(toNum(f.roomLoadKw))} kW` },
                { label:'Transmission', value:`${fmt(toNum(f.transmissionKw))} kW` },
                { label:'Fan / evaporator', value:`${fmt(toNum(f.fanKw))} kW` },
                { label:'People / door', value:`${fmt(toNum(f.peopleKw))} kW` },
                { label:'Misc', value:`${fmt(toNum(f.miscKw))} kW` },
              ]},
              { title:'COP', rows:[
                { label:'Total cooling load', value:`${fmt(result.totalCoolingKw)} kW (${fmt(result.tr, 2)} TR)` },
                { label:'Electrical input', value:`${fmt(result.inputPowerKw)} kW` },
                { label:'COP', value:fmt(result.cop, 3) },
              ]},
            ]} />
          </>
        )}
      </main>
    </div>
  )
}
