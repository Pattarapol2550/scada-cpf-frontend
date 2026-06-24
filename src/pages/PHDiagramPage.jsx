import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/layout/Navbar'
import { getMetrics, getPHDiagram } from '../services/api'
import { cyclePoints, getPHXRange, normalizePHCycle } from '../utils/phDiagram'
import { COMPRESSORS, toLocalDT } from '../utils/format'
import { Scatter } from 'react-chartjs-2'
import { Chart as ChartJS, LinearScale, LogarithmicScale, PointElement, LineElement, Tooltip } from 'chart.js'

ChartJS.register(LinearScale, LogarithmicScale, PointElement, LineElement, Tooltip)

const CYCLE_POINT_LABELS = ['1: Evap outlet', '2: Comp outlet', '3: Cond outlet', '4: Exp inlet']

// PDF-specific format: "YYYY-MM-DD  HH:mm:ss" in UTC+7
function fmtLocalDT(value) {
  if (!value) return '--'
  const d = value instanceof Date ? value : new Date(value)
  const p = n => String(n).padStart(2, '0')
  const u = new Date(d.getTime() + 7 * 3600_000)
  return `${u.getUTCFullYear()}-${p(u.getUTCMonth()+1)}-${p(u.getUTCDate())}  ${p(u.getUTCHours())}:${p(u.getUTCMinutes())}:${p(u.getUTCSeconds())}`
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
  // รับ compId เป็น argument เพื่อป้องกัน stale closure เมื่อ comp เปลี่ยน
  const load = async (compId = comp) => {
    setLoading(true); setError(null); setData(null)
    try {
      const params = useTimestamp ? { timestamp: new Date(timestamp).toISOString() } : {}
      const res = await getPHDiagram(compId, params)
      const metricParams = res.data?.timestamp
        ? {
            start: new Date(new Date(res.data.timestamp).getTime() - 2000).toISOString(),
            end: new Date(new Date(res.data.timestamp).getTime() + 2000).toISOString(),
            limit: 1,
          }
        : { limit: 1 }
      const metricRes = await getMetrics(compId, metricParams).catch(() => null)
      const metric = metricRes?.data?.find?.(r => String(r._id) === String(res.data?.record_id)) ?? metricRes?.data?.[0]
      setData({
        ...res.data,
        inputs_snapshot: res.data?.inputs_snapshot ?? metric?.inputs_snapshot,
        diagnosis: res.data?.diagnosis ?? metric?.diagnosis,
      })
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(detail || 'ไม่สามารถโหลดข้อมูลได้')
    }
    finally { setLoading(false) }
  }

  // โหลดอัตโนมัติเมื่อ comp เปลี่ยน หรือสลับ latest ↔ เจาะเวลา
  // ส่ง comp เข้า load ตรงๆ เพื่อให้ได้ค่าล่าสุดเสมอ (ไม่ติด stale closure)
  useEffect(() => { load(comp) }, [comp, useTimestamp]) // eslint-disable-line react-hooks/exhaustive-deps

  const cycle  = normalizePHCycle(data)
  const dome   = data?.saturation_dome
  const xRange = getPHXRange(cycle)
  const points = cyclePoints(cycle)
  const closedPoints = cyclePoints(cycle, true)

  const chartData = data ? {
    datasets: [
      {
        label: 'Sat. liquid',
        data: (dome?.liquid ?? []).map(p => ({ x: p.h, y: p.p })),
        borderColor: '#39c5cf', backgroundColor: 'rgba(57,197,207,0.06)',
        borderWidth: 1.5, showLine: true, tension: 0.4, pointRadius: 0, fill: true,
      },
      {
        label: 'Sat. vapour',
        data: (dome?.vapour ?? []).map(p => ({ x: p.h, y: p.p })),
        borderColor: '#39c5cf', backgroundColor: 'transparent',
        borderWidth: 1.5, showLine: true, tension: 0.4, pointRadius: 0,
      },
      {
        label: 'Cycle',
        data: closedPoints.map(p => ({ x: p.h, y: p.p })),
        borderColor: '#f0883e', backgroundColor: '#f0883e',
        borderWidth: 2, showLine: true, tension: 0,
        pointRadius: closedPoints.map((_, i) => i === closedPoints.length - 1 ? 0 : 6),
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
      const jsPDF = (await import('jspdf')).default
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()   // 297
      const H = doc.internal.pageSize.getHeight()  // 210

      // ── Color palette (light/formal) ───────────────────
      const C = {
        white:      [255, 255, 255],
        bg:         [248, 249, 250],   // header/footer bg
        border:     [220, 225, 230],   // divider lines
        cardBg:     [255, 255, 255],   // card fill
        cardBorder: [220, 225, 230],
        title:      [30,  40,  55],    // main heading
        label:      [100, 110, 125],   // small labels
        value:      [30,  40,  55],    // data values
        accent:     [30,  100, 200],   // point headers, section titles
        accentVal:  [15,  120, 80],    // efficiency value
      }

      // ── Header bar ────────────────────────────────────
      doc.setFillColor(...C.bg)
      doc.rect(0, 0, W, 20, 'F')
      // bottom border line
      doc.setDrawColor(...C.border)
      doc.setLineWidth(0.3)
      doc.line(0, 20, W, 20)

      doc.setTextColor(...C.title)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`P-H Diagram  |  ${comp}`, 12, 13)

      doc.setTextColor(...C.label)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`Timestamp: ${fmtLocalDT(data?.timestamp)}`, W - 12, 13, { align: 'right' })

      // ── White body background ──────────────────────────
      doc.setFillColor(...C.white)
      doc.rect(0, 20, W, H - 28, 'F')

      // ── Chart image ───────────────────────────────────
      const canvas = chartRef.current.canvas
      const imgData = canvas.toDataURL('image/png', 1.0)
      const chartX = 10
      const chartY = 24
      const chartW = 188
      const chartH = Math.min((chartW / canvas.width) * canvas.height, 150)
      doc.addImage(imgData, 'PNG', chartX, chartY, chartW, chartH)

      // ── Right panel ────────────────────────────────────
      const RX = 203    // right panel x
      const RW = 86     // right panel width
      let   RY = 24

      // section: Cycle Points
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.accent)
      doc.text('CYCLE POINTS', RX, RY + 4)
      RY += 8

      const pdfCyclePoints = [
        { label: 'Point 1  —  Evaporator outlet', pt: cycle.point1 },
        { label: 'Point 2  —  Compressor outlet', pt: cycle.point2 },
        { label: 'Point 3  —  Condenser outlet',  pt: cycle.point3 },
        { label: 'Point 4  —  Expansion inlet',   pt: cycle.point4 },
      ]

      for (const { label, pt } of pdfCyclePoints) {
        if (!pt) continue
        // card outline
        doc.setDrawColor(...C.cardBorder)
        doc.setLineWidth(0.25)
        doc.setFillColor(...C.cardBg)
        doc.roundedRect(RX, RY, RW, 21, 1.5, 1.5, 'FD')

        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...C.value)
        doc.text(label, RX + 3, RY + 5.5)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C.label)
        doc.text(`h = ${pt.h} kJ/kg`, RX + 3,  RY + 11)
        doc.text(`P = ${pt.p} MPa`,   RX + 44, RY + 11)
        if (pt.t_c != null) {
          doc.setTextColor(...C.value)
          doc.text(`T = ${pt.t_c} °C`, RX + 3, RY + 17)
        }
        RY += 25
      }

      // section: Isentropic Efficiency
      if (cycle.isentropic_efficiency != null) {
        RY += 2
        doc.setDrawColor(...C.cardBorder)
        doc.setFillColor(...C.bg)
        doc.roundedRect(RX, RY, RW, 16, 1.5, 1.5, 'FD')

        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...C.label)
        doc.text('ISENTROPIC EFFICIENCY', RX + 3, RY + 5.5)

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...C.accentVal)
        doc.text(`${(cycle.isentropic_efficiency * 100).toFixed(1)} %`, RX + 3, RY + 13.5)
        RY += 20
      }

      // section: Sensor Inputs
      const inp = data?.inputs_snapshot
      const inputRows = inp ? [
        ['SP', inp.sp_kg,         'kg/cm2'],
        ['DP', inp.dp_kg,         'kg/cm2'],
        ['ST', inp.st_c,          'deg C'],
        ['DT', inp.dt_c,          'deg C'],
        ['Liq Temp', inp.liquid_temp_c, 'deg C'],
        ['Current',  inp.current_amp,   'A'],
      ].filter(([, v]) => v != null) : []

      if (inputRows.length > 0) {
        RY += 2
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...C.accent)
        doc.text('SENSOR INPUTS', RX, RY + 4)
        RY += 8

        doc.setDrawColor(...C.cardBorder)
        doc.setFillColor(...C.cardBg)
        doc.roundedRect(RX, RY, RW, inputRows.length * 7 + 4, 1.5, 1.5, 'FD')

        for (let i = 0; i < inputRows.length; i++) {
          const [key, val, unit] = inputRows[i]
          const rowY = RY + 6 + i * 7
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...C.label)
          doc.text(key, RX + 3, rowY)
          doc.setTextColor(...C.value)
          doc.setFont('helvetica', 'bold')
          doc.text(`${val}`, RX + 32, rowY)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...C.label)
          doc.text(unit, RX + 54, rowY)
        }
      }

      // ── Divider between chart and right panel ──────────
      doc.setDrawColor(...C.border)
      doc.setLineWidth(0.25)
      doc.line(RX - 4, 24, RX - 4, H - 10)

      // ── Footer ────────────────────────────────────────
      doc.setFillColor(...C.bg)
      doc.rect(0, H - 9, W, 9, 'F')
      doc.setDrawColor(...C.border)
      doc.setLineWidth(0.3)
      doc.line(0, H - 9, W, H - 9)

      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C.label)
      doc.text('Compressor Monitor  |  Ammonia Refrigeration Diagnostics', 12, H - 3)
      doc.text(`Generated: ${fmtLocalDT(new Date())}`, W - 12, H - 3, { align: 'right' })

      const fileName = `ph_diagram_${comp}_${fmtLocalDT(data?.timestamp || new Date()).slice(0,10)}.pdf`
      doc.save(fileName)
    } catch (e) {
      console.error('PDF export failed', e)
      alert('Export PDF failed: ' + e.message)
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
              🕐 ระบุเวลา
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
                onClick={() => load(comp)}
                disabled={loading}
                style={{ fontSize: 11, padding: '5px 14px' }}
              >
                🔍 ดึงข้อมูล
              </button>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* ── Selected-time badge (always visible in timestamp mode) ── */}
          {useTimestamp && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '4px 10px',
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                เลือกเวลา
              </span>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-1)', fontWeight: 600 }}>
                {timestamp.replace('T', '  ')}
              </span>
            </div>
          )}

          
          {data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: useTimestamp ? 'var(--blue, #388bfd)' : 'var(--text-3)',
                background: useTimestamp ? 'rgba(56,139,253,0.12)' : 'var(--bg2)',
                border: '1px solid', borderColor: useTimestamp ? 'var(--blue, #388bfd)' : 'var(--border)',
                borderRadius: 6, padding: '2px 7px',
              }}>
                {useTimestamp ? '📌 ข้อมูล ณ' : 'ข้อมูลล่าสุด'}
              </span>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-1)', fontWeight: 600 }}>
                {fmtLocalDT(data.timestamp)}
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
              <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,
                background:'var(--bg1)', borderRadius:8 }}>
                <span style={{ fontSize:32, opacity:0.5 }}>🔍</span>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--red,#f85149)' }}>{error}</span>
                {useTimestamp && (
                  <span style={{ fontSize:11, color:'var(--text-3)' }}>
                    ไม่พบข้อมูล ณ เวลา <span style={{ fontFamily:'monospace', color:'var(--text-2)' }}>{timestamp.replace('T','  ')}</span>
                  </span>
                )}
                {useTimestamp && (
                  <span style={{ fontSize:10, color:'var(--text-3)' }}>ลองเลือกเวลาอื่น หรือตรวจสอบว่ามีข้อมูลในช่วงนั้น</span>
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
                          if (ctx.datasetIndex === 2 && ctx.dataIndex < points.length) {
                            return `${CYCLE_POINT_LABELS[ctx.dataIndex] ?? `Point ${ctx.dataIndex + 1}`} — h: ${ctx.raw.x} kJ/kg  P: ${ctx.raw.y.toFixed(3)} MPa`
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
                      type: 'logarithmic', min: (() => { const ps = dome?.liquid?.map(p => p.p).filter(Boolean) ?? []; return ps.length ? Math.min(...ps) * 0.9 : 0.04 })(), max: 7,
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
            {points.map((pt, i) => pt && (
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
