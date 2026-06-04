import { useState, useEffect } from 'react'
import Navbar from '../components/layout/Navbar'
import { getPHDiagram } from '../services/api'
import { Scatter } from 'react-chartjs-2'
import { Chart as ChartJS, LinearScale, LogarithmicScale, PointElement, LineElement, Tooltip } from 'chart.js'

ChartJS.register(LinearScale, LogarithmicScale, PointElement, LineElement, Tooltip)

const COMPRESSORS = ['COMP-01','COMP-02','COMP-03','COMP-04','COMP-05','COMP-06','COMP-07']

export default function PHDiagramPage() {
  const [comp, setComp] = useState('COMP-01')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = async (c) => {
    setLoading(true); setError(null)
    try {
      const res = await getPHDiagram(c)
      setData(res.data)
    } catch { setError('ไม่สามารถโหลดข้อมูลได้') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(comp) }, [comp])

  const cycle = data?.cycle
  const dome  = data?.saturation_dome

  const chartData = data ? {
    datasets: [
      { label: 'Sat. liquid', data: dome.liquid.map(p => ({ x: p.h, y: p.p })), borderColor: '#39c5cf', backgroundColor: 'rgba(57,197,207,0.06)', borderWidth: 1.5, showLine: true, tension: 0.4, pointRadius: 0, fill: true },
      { label: 'Sat. vapour', data: dome.vapour.map(p => ({ x: p.h, y: p.p })), borderColor: '#39c5cf', backgroundColor: 'transparent', borderWidth: 1.5, showLine: true, tension: 0.4, pointRadius: 0 },
      { label: 'Cycle', data: [cycle?.point1, cycle?.point2, cycle?.point3, cycle?.point4, cycle?.point1].filter(Boolean).map(p => ({ x: p.h, y: p.p })), borderColor: '#f0883e', backgroundColor: '#f0883e', borderWidth: 2, showLine: true, tension: 0, pointRadius: [6,6,6,6,0], pointBackgroundColor: '#f0883e', pointBorderColor: '#161b22', pointBorderWidth: 2 },
    ],
  } : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)' }}>
      <Navbar />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Compressor</span>
          <select value={comp} onChange={e => setComp(e.target.value)}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', padding: '6px 10px', fontSize: 12, outline: 'none' }}>
            {COMPRESSORS.map(c => <option key={c}>{c}</option>)}
          </select>
          {data && <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>Latest record: {data.timestamp?.slice(0, 16).replace('T', ' ')}</span>}
        </div>

        {/* Chart */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">P-H Diagram — {comp}</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {[['Saturation dome','#39c5cf'],['Cycle','#f0883e']].map(([l,c]) => (
                <span key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'var(--text-2)', fontFamily:'monospace' }}>
                  <span style={{ width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>
                  {l}
                </span>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', height: 480 }}>
            {loading && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-3)', fontSize:13 }}>Loading…</div>}
            {error   && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--red)', fontSize:13 }}>{error}</div>}
            {chartData && (
              <Scatter data={chartData} options={{
                responsive: true, maintainAspectRatio: false, animation: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1c2333', borderColor: '#30363d', borderWidth: 1, bodyColor: '#e6edf3',
                  callbacks: { label: ctx => {
                    if (ctx.datasetIndex === 2 && ctx.dataIndex < 4) {
                      const pts = ['1: Evap outlet','2: Comp outlet','3: Cond outlet','4: Exp inlet']
                      return `${pts[ctx.dataIndex]} — h: ${ctx.raw.x} kJ/kg  P: ${ctx.raw.y.toFixed(3)} MPa`
                    }
                    return `h: ${ctx.raw.x}  P: ${Number(ctx.raw.y).toFixed(3)} MPa`
                  }}
                }},
                scales: {
                  x: { type: 'linear', min: 150, max: 1800, title: { display: true, text: 'Enthalpy h (kJ/kg)', color: '#4d5562', font: { size: 11 } }, ticks: { color: '#4d5562' }, grid: { color: 'rgba(48,54,61,0.5)' } },
                  y: { type: 'logarithmic', min: 0.08, max: 7, title: { display: true, text: 'Pressure P (MPa)', color: '#4d5562', font: { size: 11 } }, ticks: { color: '#4d5562', callback: v => v < 1 ? v.toFixed(2) : v.toFixed(1) }, grid: { color: 'rgba(48,54,61,0.5)' } },
                },
              }} />
            )}
          </div>
        </div>

        {/* Cycle values table */}
        {cycle && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[cycle.point1, cycle.point2, cycle.point3, cycle.point4].map((pt, i) => pt && (
              <div key={i} className="panel" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#f0883e', marginBottom: 6, letterSpacing: '0.06em' }}>Point {i+1}</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 2 }}>{pt.label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-1)' }}>h = {pt.h} kJ/kg</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-1)' }}>P = {pt.p} MPa</div>
                {pt.t_c != null && <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-1)' }}>T = {pt.t_c} °C</div>}
              </div>
            ))}
          </div>
        )}

        {cycle?.isentropic_efficiency != null && (
          <div className="panel" style={{ padding: '12px 16px' }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>Isentropic efficiency: </span>
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--cyan)' }}>
              {(cycle.isentropic_efficiency * 100).toFixed(1)} %
            </span>
          </div>
        )}

      </div>
    </div>
  )
}
