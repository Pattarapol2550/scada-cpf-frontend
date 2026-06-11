import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/layout/Navbar'
import { getPHDiagram } from '../services/api'
import { Scatter } from 'react-chartjs-2'
import { Chart as ChartJS, LinearScale, LogarithmicScale, PointElement, LineElement, Tooltip } from 'chart.js'

ChartJS.register(LinearScale, LogarithmicScale, PointElement, LineElement, Tooltip)

const COMPRESSORS = ['COMP-01','COMP-02','COMP-03','COMP-04','COMP-05','COMP-06','COMP-07']

function toLocalDT(date) {
  const p = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

function getXRange(cycle) {
  if (!cycle) return { min: 150, max: 1800 }
  const pts = [cycle.point1, cycle.point2, cycle.point3, cycle.point4].filter(Boolean)
  if (!pts.length) return { min: 150, max: 1800 }
  const hs = pts.map(p => p.h)
  const pad = (Math.max(...hs) - Math.min(...hs)) * 0.18
  return {
    min: Math.floor(Math.min(...hs) - pad),
    max: Math.ceil(Math.max(...hs) + pad),
  }
}

export default function PHDiagramPage() {
  const [comp, setComp]           = useState('COMP-01')
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [exporting, setExporting] = useState(false)

  // "latest" mode vs. เจาะเวลาเอง
  const [useTimestamp, setUseTimestamp] = useState(false)
  const [timestamp, setTimestamp]       = useState(() => toLocalDT(new Date()))

  const chartRef = useRef(null)

  // ── API call ───────────────────────────────────────────
  const load = async () => {
    setLoading(true); setError(null); setData(null)
    try {
      const params = useTimestamp ? { timestamp: new Date(timestamp).toISOString() } : {}
      const res = await getPHDiagram(comp, params)
      setData(res.data)
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (detail) setError(detail)
      else setError('ไม่สามารถโหลดข้อมูลได้')
    }
    finally { setLoading(false) }
  }

  // โหลดอัตโนมัติเมื่อ comp เปลี่ยน หรือสลับ latest ↔ เจาะเวลา
  useEffect(() => { load() }, [comp, useTimestamp]) // eslint-disable-line react-hooks/exhaustive-deps

  const cycle  = data?.cycle
  const dome   = data?.saturation_dome
  const xRange = getXRange(cycle)

  const chartData = data ? {
    datasets: [
      {
        label: 'Sat. liquid',
        data: dome.liquid.map(p => ({ x: p.h, y: p.p })),
        borderColor: '#39c5cf', backgroundColor: 'rgba(57,197,207,0.06)',
        borderWidth: 1.5, showLine: true, tension: 0.4, pointRadius: 0, fill: true,
      },
      {
        label: 'Sat. vapour',
        data: dome.vapour.map(p => ({ x: p.h, y: p.p })),
        borderColor: '#39c5cf', backgroundColor: 'transparent',
        borderWidth: 1.5, showLine: true, tension: 0.4, pointRadius: 0,
      },
      {
        label: 'Cycle',
        data: [cycle?.point1, cycle?.point2, cycle?.point3, cycle?.point4, cycle?.point1]
          .filter(Boolean).map(p => ({ x: p.h, y: p.p })),
        borderColor: '#f0883e', backgroundColor: '#f0883e',
        borderWidth: 2, showLine: true, tension: 0,
        pointRadius: [6,6,6,6,0],
        pointBackgroundColor: '#f0883e',
        pointBorderColor: '#161b22', pointBorderWidth: 2,
      },
    ],
  } : null

  // ── PDF Export ─────────────────────────────────────────
  const exportPDF = async () => {
    if (!chartRef.current || !cycle) return
    setExporting(true)
    try {
      // dynamic import เพื่อไม่ให้หน้าอื่นโหลดช้า
      const jsPDF = (await import('jspdf')).default

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()   // 297
      const H = doc.internal.pageSize.getHeight()  // 210

      // ── Header ────────────────────────────────────────
      doc.setFillColor(22, 27, 34)
      doc.rect(0, 0, W, 18, 'F')

      doc.setTextColor(240, 136, 62)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(`P-H Diagram — ${comp}`, 12, 11)

      doc.setTextColor(140, 148, 156)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const tsLabel = data?.timestamp
        ? new Date(data.timestamp).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false,
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '--'
      doc.text(`Timestamp: ${tsLabel}`, W - 12, 11, { align: 'right' })

      // ── Chart image ───────────────────────────────────
      // ใช้ canvas จาก chartRef โดยตรง (ไม่ต้องสร้างใหม่)
      const canvas = chartRef.current.canvas
      const imgData = canvas.toDataURL('image/png', 1.0)

      const chartX = 10
      const chartY = 22
      const chartW = 190
      const chartH = (chartW / canvas.width) * canvas.height

      doc.addImage(imgData, 'PNG', chartX, chartY, chartW, Math.min(chartH, 155))

      // ── Cycle points table (ด้านขวา) ─────────────────
      const tableX = 206
      let   tableY = 22

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(240, 136, 62)
      doc.text('Cycle Points', tableX, tableY)
      tableY += 6

      const points = [
        { label: 'Pt 1 — Evap outlet', pt: cycle.point1 },
        { label: 'Pt 2 — Comp outlet', pt: cycle.point2 },
        { label: 'Pt 3 — Cond outlet', pt: cycle.point3 },
        { label: 'Pt 4 — Exp inlet',   pt: cycle.point4 },
      ]

      for (const { label, pt } of points) {
        if (!pt) continue
        // row background
        doc.setFillColor(28, 35, 51)
        doc.roundedRect(tableX, tableY, 82, 22, 2, 2, 'F')

        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(230, 237, 243)
        doc.text(label, tableX + 3, tableY + 5)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(140, 148, 156)
        doc.text(`h = ${pt.h} kJ/kg`, tableX + 3,  tableY + 11)
        doc.text(`P = ${pt.p} MPa`,   tableX + 42, tableY + 11)
        if (pt.t_c != null)
          doc.text(`T = ${pt.t_c} °C`, tableX + 3, tableY + 17)

        tableY += 26
      }

      // ── Isentropic efficiency ─────────────────────────
      if (cycle.isentropic_efficiency != null) {
        tableY += 2
        doc.setFillColor(28, 35, 51)
        doc.roundedRect(tableX, tableY, 82, 14, 2, 2, 'F')

        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(140, 148, 156)
        doc.text('Isentropic Efficiency', tableX + 3, tableY + 5)

        doc.setFontSize(11)
        doc.setTextColor(57, 197, 207)
        doc.text(`${(cycle.isentropic_efficiency * 100).toFixed(1)} %`, tableX + 3, tableY + 12)
        tableY += 18
      }

      // ── Inputs snapshot (ถ้ามี) ───────────────────────
      const inp = data?.inputs_snapshot
      if (inp) {
        tableY += 4
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(240, 136, 62)
        doc.text('Sensor Inputs', tableX, tableY)
        tableY += 5

        const rows = [
          ['SP', inp.sp_kg,        'kg/cm²'],
          ['DP', inp.dp_kg,        'kg/cm²'],
          ['ST', inp.st_c,         '°C'],
          ['DT', inp.dt_c,         '°C'],
          ['Liq Temp', inp.liquid_temp_c, '°C'],
          ['Current', inp.current_amp, 'A'],
        ].filter(([,v]) => v != null)

        doc.setFillColor(22, 30, 46)
        doc.roundedRect(tableX, tableY, 82, rows.length * 7 + 4, 2, 2, 'F')

        for (let i = 0; i < rows.length; i++) {
          const [key, val, unit] = rows[i]
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(140, 148, 156)
          doc.text(key, tableX + 3, tableY + 5 + i * 7)
          doc.setTextColor(200, 210, 220)
          doc.text(`${val} ${unit}`, tableX + 30, tableY + 5 + i * 7)
        }
      }

      // ── Footer ────────────────────────────────────────
      doc.setFillColor(22, 27, 34)
      doc.rect(0, H - 8, W, 8, 'F')
      doc.setFontSize(7)
      doc.setTextColor(80, 90, 100)
      doc.text('Generated by Compressor Monitor', 12, H - 2.5)
      doc.text(new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false }), W - 12, H - 2.5, { align: 'right' })

      const fileName = `ph_diagram_${comp}_${(data?.timestamp || new Date().toISOString()).slice(0, 16).replace('T','_')}.pdf`
      doc.save(fileName)
    } catch (e) {
      console.error('PDF export failed', e)
      alert('Export PDF ไม่สำเร็จ: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)' }}>
      <Navbar />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Filter bar ─────────────────────────────── */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          {/* Compressor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Compressor</span>
            <select value={comp} onChange={e => setComp(e.target.value)}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', padding: '6px 10px', fontSize: 12, outline: 'none' }}>
              {COMPRESSORS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Toggle: Latest / เจาะเวลา */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setUseTimestamp(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
                background: useTimestamp ? 'var(--blue-dim, rgba(56,139,253,0.15))' : 'var(--bg2)',
                borderColor: useTimestamp ? 'var(--blue, #388bfd)' : 'var(--border)',
                color: useTimestamp ? 'var(--blue, #388bfd)' : 'var(--text-2)',
              }}
            >
              🕐 เจาะเวลา
            </button>
          </div>

          {/* Datetime input — แสดงเฉพาะตอน useTimestamp */}
          {useTimestamp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>เวลา</span>
              <input
                type="datetime-local"
                step ="1"
                value={timestamp}
                onChange={e => setTimestamp(e.target.value)}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
                  color: 'var(--text-1)', padding: '6px 10px', fontSize: 12, outline: 'none',
                }}
              />
              <button
                className="btn-primary"
                onClick={load}
                disabled={loading}
                style={{ fontSize: 11, padding: '5px 14px' }}
              >
                🔍 ดึงข้อมูล
              </button>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Timestamp label */}
          {data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: useTimestamp ? 'var(--blue, #388bfd)' : 'var(--text-3)',
                background: useTimestamp ? 'var(--blue-dim, rgba(56,139,253,0.12))' : 'var(--bg2)',
                border: '1px solid', borderColor: useTimestamp ? 'var(--blue, #388bfd)' : 'var(--border)',
                borderRadius: 6, padding: '2px 8px',
              }}>
                {useTimestamp ? '📌 ข้อมูล ณ เวลา' : '🕐 ล่าสุด'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-1)', fontFamily: 'monospace', fontWeight: 600 }}>
                {data.timestamp
                  ? new Date(data.timestamp).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false,
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '--'}
              </span>
            </div>
          )}

          {/* Export PDF */}
          <button
            onClick={exportPDF}
            disabled={!data || exporting}
            className="btn-ghost"
            style={{ fontSize: 11, padding: '5px 14px', opacity: data ? 1 : 0.4 }}
          >
            {exporting ? '⏳ กำลัง Export…' : '⬇ PDF'}
          </button>
        </div>

        {/* ── Chart ──────────────────────────────────── */}
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
            {loading && <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-3)',fontSize:13 }}>Loading…</div>}
            {error   && (
              <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8 }}>
                <span style={{ fontSize:28, opacity:0.5 }}>🔍</span>
                <span style={{ fontSize:13, color:'var(--red, #f85149)', fontWeight:600 }}>{error}</span>
                {useTimestamp && (
                  <span style={{ fontSize:11, color:'var(--text-3)' }}>
                    ลองเลือกเวลาอื่น หรือตรวจสอบว่ามีข้อมูลในช่วงนั้น
                  </span>
                )}
              </div>
            )}
            {chartData && (
              <Scatter
                ref={chartRef}
                data={chartData}
                options={{
                  responsive: true, maintainAspectRatio: false, animation: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#1c2333', borderColor: '#30363d', borderWidth: 1, bodyColor: '#e6edf3',
                      callbacks: {
                        label: ctx => {
                          if (ctx.datasetIndex === 2 && ctx.dataIndex < 4) {
                            const pts = ['1: Evap outlet','2: Comp outlet','3: Cond outlet','4: Exp inlet']
                            return `${pts[ctx.dataIndex]} — h: ${ctx.raw.x} kJ/kg  P: ${ctx.raw.y.toFixed(3)} MPa`
                          }
                          return `h: ${ctx.raw.x}  P: ${Number(ctx.raw.y).toFixed(3)} MPa`
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      type: 'linear', min: xRange.min, max: xRange.max,
                      title: { display: true, text: 'Enthalpy h (kJ/kg)', color: '#4d5562', font: { size: 11 } },
                      ticks: { color: '#4d5562' }, grid: { color: 'rgba(48,54,61,0.5)' },
                    },
                    y: {
                      type: 'logarithmic', min: 0.08, max: 7,
                      title: { display: true, text: 'Pressure P (MPa)', color: '#4d5562', font: { size: 11 } },
                      ticks: { color: '#4d5562', callback: v => v < 1 ? v.toFixed(2) : v.toFixed(1) },
                      grid: { color: 'rgba(48,54,61,0.5)' },
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        {/* ── Cycle values ──────────────────────────── */}
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
            {!data?.inputs_snapshot?.dt_c && (
              <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 8 }}>(assume η = 0.70)</span>
            )}
          </div>
        )}

      </div>
    </div>
  )
}