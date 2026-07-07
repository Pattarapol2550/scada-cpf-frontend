import { useState, useRef, useCallback } from 'react'
import Sidebar from '../components/layout/Sidebar'
import { bulkImport } from '../services/api'
import { useCompressors } from '../hooks/useCompressors'

// CSV compressor_id (number) → "COMP-01" etc. — validIds มาจาก backend (useCompressors)
const csvIdToComp = (id, validIds) => {
  const n = Number(id)
  if (isNaN(n) || n < 1) return null
  const key = `COMP-${String(n).padStart(2, '0')}`
  return validIds.includes(key) ? key : null
}

const COMP_TYPE_COLOR = { high_stage: 'var(--cyan)', booster: 'var(--green)', single: 'var(--text-2)' }
const BATCH = 200   // records per API call

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) throw new Error('ไฟล์ว่างหรือมีแค่ header')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    return Object.fromEntries(headers.map((h, i) => [h, vals[i]?.trim() ?? '']))
  })
}

function csvRowToPayload(row, validIds, typeMap) {
  const compressor_id = csvIdToComp(row.compressor_id, validIds)
  if (!compressor_id) return null
  const f = (k) => { const v = row[k]; return v === '' || v == null ? null : Number(v) }
  const timestamp = row._time ? new Date(row._time).toISOString() : null
  if (!timestamp) return null
  const sp_kg = f('sp')
  const dp_kg = f('dp')
  if (sp_kg == null || dp_kg == null) return null    // required fields
  return {
    compressor_id,
    timestamp,
    sp_kg,
    dp_kg,
    st_c:             f('st'),
    dt_c:             f('dt'),
    current_amp:      f('amp'),
    liquid_temp_c:    null,
    compressor_type:  typeMap[compressor_id] ?? 'single',
    // extra sensor fields
    glycol_temp:      f('glycol_temp'),
    glycol_level:     f('glycol_level'),
    oil_pressure:     f('op'),
    oil_temp:         f('ot'),
    oil_filter:       f('oil_filter'),
    oil_level:        f('oil_level'),
    slide_valve_pct:  f('slide_valve'),
    nh3_level:        f('nh3_level'),
    nh3_pump:         f('nh3_pump'),
    room_temp_1b:     f('room_1b'),
    room_temp_1c:     f('room_1c'),
    room_temp_2b:     f('room_2b'),
    room_temp_2c:     f('room_2c'),
    room_temp_3b:     f('room_3b'),
    run_hour:         f('run_hour'),
  }
}

const S = {
  badge: (c) => ({ display:'inline-block', background:c+'22', color:c, border:`1px solid ${c}44`, borderRadius:5, fontSize:10, fontWeight:700, padding:'2px 7px', fontFamily:'JetBrains Mono, monospace' }),
  card: { background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:14 },
  head: { display:'flex', alignItems:'center', gap:9, padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)' },
  body: { padding:'14px 16px' },
}

export default function ImportPage() {
  const { ids: compressorIds, typeMap, loading: compLoading } = useCompressors()
  const [parsed,   setParsed]   = useState(null)   // { rows: RawCSVRow[], payloads: Payload[], summary }
  const [selected, setSelected] = useState(new Set())
  const [status,   setStatus]   = useState(null)   // null | 'importing' | 'done' | 'error'
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result,   setResult]   = useState(null)
  const [err,      setErr]      = useState(null)
  const fileRef = useRef()

  const handleFile = useCallback((file) => {
    if (!file) return
    if (compLoading) { setErr('กำลังโหลดรายชื่อคอมเพรสเซอร์ กรุณารอสักครู่แล้วลองใหม่'); return }
    setStatus(null); setResult(null); setErr(null); setParsed(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw = parseCSV(e.target.result)
        const payloads = raw.map(r => csvRowToPayload(r, compressorIds, typeMap)).filter(Boolean)
        // summary per compressor
        const counts = {}
        payloads.forEach(p => { counts[p.compressor_id] = (counts[p.compressor_id] || 0) + 1 })
        const skipped = raw.length - payloads.length
        setParsed({ raw, payloads, counts, skipped, preview: raw.slice(0, 5) })
        setSelected(new Set(Object.keys(counts)))
      } catch (e2) {
        setErr('อ่านไฟล์ไม่ได้: ' + e2.message)
      }
    }
    reader.readAsText(file, 'utf-8')
  }, [compressorIds, typeMap, compLoading])

  const onDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }
  const onPick = (e) => handleFile(e.target.files[0])
  const toggleComp = (c) => setSelected(prev => { const s = new Set(prev); s.has(c) ? s.delete(c) : s.add(c); return s })

  const startImport = async () => {
    if (!parsed) return
    const rows = parsed.payloads.filter(p => selected.has(p.compressor_id))
    if (!rows.length) { setErr('ไม่มีข้อมูลที่เลือก'); return }

    setStatus('importing'); setErr(null); setResult(null)
    let imported = 0, failed = 0

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      setProgress({ done: i, total: rows.length })
      try {
        const { data } = await bulkImport(batch)
        imported += data.imported
        failed   += data.failed ?? 0
      } catch (e2) {
        failed += batch.length
        setErr('เกิดข้อผิดพลาดขณะ import: ' + (e2?.response?.data?.detail || e2.message))
        setStatus('error')
        setResult({ imported, failed })
        return
      }
    }

    setProgress({ done: rows.length, total: rows.length })
    setStatus('done')
    setResult({ imported, failed })
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg0)' }}>
      <Sidebar />
      <div style={{ flex:1, minWidth:0, padding:'24px 20px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:20, fontWeight:600, fontFamily:'JetBrains Mono, monospace', color:'var(--text-1)', margin:0 }}>
            Import CSV
          </h1>
          <p style={{ fontSize:12, color:'var(--text-3)', marginTop:3 }}>
            นำเข้าข้อมูล sensor จากไฟล์ CSV (InfluxDB export format) เข้าสู่ฐานข้อมูล
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border:'2px dashed var(--border)', borderRadius:12, padding:'36px 20px',
            textAlign:'center', cursor:'pointer', marginBottom:14, transition:'border-color 0.2s',
            background: parsed ? 'var(--bg1)' : 'transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <i className="ti ti-file-upload" style={{ fontSize:32, color:'var(--text-3)', display:'block', marginBottom:8 }} />
          {parsed ? (
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--green)' }}>✓ โหลดไฟล์สำเร็จ</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>
                {parsed.raw.length.toLocaleString()} แถว · {parsed.payloads.length.toLocaleString()} records พร้อม import · ข้ามไป {parsed.skipped} แถว
              </div>
              <div style={{ fontSize:11, color:'var(--blue)', marginTop:4 }}>คลิกเพื่อเลือกไฟล์ใหม่</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:13, color:'var(--text-2)' }}>ลากไฟล์ CSV มาวางที่นี่ หรือคลิกเพื่อเลือก</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>รองรับ InfluxDB export format (sensordata.csv)</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".csv" onChange={onPick} style={{ display:'none' }} />
        </div>

        {err && (
          <div style={{ background:'var(--red-dim)', border:'1px solid rgba(248,81,73,0.3)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--red)', marginBottom:12 }}>
            ⚠ {err}
          </div>
        )}

        {/* Summary + compressor selector */}
        {parsed && (
          <>
            <div style={S.card}>
              <div style={S.head}>
                <i className="ti ti-chart-bar" style={{ fontSize:15, color:'var(--blue)' }} />
                <span style={{ fontSize:13, fontWeight:600 }}>ข้อมูลในไฟล์</span>
              </div>
              <div style={S.body}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:8 }}>
                  {Object.entries(parsed.counts).sort().map(([comp, cnt]) => {
                    const type  = typeMap[comp] ?? 'single'
                    const color = COMP_TYPE_COLOR[type]
                    const on    = selected.has(comp)
                    return (
                      <div key={comp}
                        onClick={() => toggleComp(comp)}
                        style={{
                          background: on ? color+'18' : 'var(--bg2)',
                          border:`1px solid ${on ? color+'55' : 'var(--border)'}`,
                          borderRadius:8, padding:'10px 12px', cursor:'pointer', transition:'all 0.15s',
                        }}
                      >
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                          <div style={{ width:14, height:14, borderRadius:3, background: on ? color : 'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {on && <i className="ti ti-check" style={{ fontSize:10, color:'#0d1117' }} />}
                          </div>
                          <span style={{ fontSize:12, fontWeight:600, color: on ? 'var(--text-1)' : 'var(--text-3)' }}>{comp}</span>
                          <span style={S.badge(color)}>{type === 'high_stage' ? 'High' : type === 'booster' ? 'Boost' : 'Single'}</span>
                        </div>
                        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:13, fontWeight:600, color: on ? color : 'var(--text-3)' }}>
                          {cnt.toLocaleString()} records
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop:10, fontSize:11, color:'var(--text-3)' }}>
                  เลือก {selected.size} / {Object.keys(parsed.counts).length} compressor ·{' '}
                  {parsed.payloads.filter(p => selected.has(p.compressor_id)).length.toLocaleString()} records จะถูก import
                  {parsed.skipped > 0 && ` · ข้าม ${parsed.skipped} แถว (SP/DP ว่าง หรือ compressor_id ไม่รู้จัก)`}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div style={S.card}>
              <div style={S.head}>
                <i className="ti ti-table" style={{ fontSize:15, color:'var(--text-3)' }} />
                <span style={{ fontSize:13, fontWeight:600 }}>ตัวอย่างข้อมูล (5 แถวแรก)</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr>
                      {['_time','compressor_id','amp','sp','dp','st','dt'].map(h => (
                        <th key={h} style={{ padding:'6px 12px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-3)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap', background:'var(--bg2)' }}>{h}</th>
                      ))}
                      <th style={{ padding:'6px 12px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--cyan)', borderBottom:'1px solid var(--border)', background:'var(--bg2)', whiteSpace:'nowrap' }}>→ COMP ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.preview.map((row, i) => {
                      const mapped = csvIdToComp(row.compressor_id, compressorIds)
                      return (
                        <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                          {['_time','compressor_id','amp','sp','dp','st','dt'].map(h => (
                            <td key={h} style={{ padding:'6px 12px', fontFamily:'JetBrains Mono, monospace', color:'var(--text-2)', whiteSpace:'nowrap' }}>{row[h] || '—'}</td>
                          ))}
                          <td style={{ padding:'6px 12px', fontFamily:'JetBrains Mono, monospace', color: mapped ? 'var(--cyan)' : 'var(--red)', fontWeight:600 }}>
                            {mapped ?? '✗ ข้าม'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column mapping info */}
            <div style={S.card}>
              <div style={S.head}>
                <i className="ti ti-arrows-exchange" style={{ fontSize:15, color:'var(--text-3)' }} />
                <span style={{ fontSize:13, fontWeight:600 }}>การ mapping คอลัมน์</span>
              </div>
              <div style={{ ...S.body, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:8 }}>
                {[
                  ['_time',        'timestamp'],
                  ['compressor_id','COMP-0X (1→COMP-01 ฯลฯ)'],
                  ['amp',          'current_amp (A)'],
                  ['sp',           'sp_kg (kg/cm²g)  ✱ required'],
                  ['dp',           'dp_kg (kg/cm²g)  ✱ required'],
                  ['st',           'st_c (°C)'],
                  ['dt',           'dt_c (°C)'],
                  ['glycol_temp',  'glycol_temp → condenser alarm'],
                  ['glycol_level', 'glycol_level'],
                  ['op',           'oil_pressure (kg/cm²)'],
                  ['ot',           'oil_temp (°C)'],
                  ['oil_filter',   'oil_filter'],
                  ['oil_level',    'oil_level'],
                  ['slide_valve',  'slide_valve_pct (%)'],
                  ['nh3_level',    'nh3_level'],
                  ['nh3_pump',     'nh3_pump'],
                  ['room_1b',      'room_temp_1b (°C)'],
                  ['room_1c',      'room_temp_1c (°C)'],
                  ['room_2b',      'room_temp_2b (°C)'],
                  ['room_2c',      'room_temp_2c (°C)'],
                  ['room_3b',      'room_temp_3b (°C)'],
                  ['run_hour',     'run_hour (hr)'],
                ].map(([csv, db]) => (
                  <div key={csv} style={{ background:'var(--bg2)', borderRadius:7, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--amber)', minWidth:60 }}>{csv}</span>
                    <i className="ti ti-arrow-right" style={{ fontSize:12, color:'var(--text-3)', flexShrink:0 }} />
                    <span style={{ fontSize:11, color:'var(--text-2)' }}>{db}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Import button + progress */}
            {status === 'importing' ? (
              <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--text-1)' }}>กำลัง import…</span>
                  <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--blue)' }}>{progress.done.toLocaleString()} / {progress.total.toLocaleString()} ({pct}%)</span>
                </div>
                <div style={{ height:6, background:'var(--bg2)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:'var(--blue)', borderRadius:3, transition:'width 0.3s' }} />
                </div>
              </div>
            ) : status === 'done' ? (
              <div style={{ background:'var(--green-dim)', border:'1px solid rgba(63,185,80,0.3)', borderRadius:10, padding:'14px 18px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--green)', marginBottom:4 }}>✓ Import สำเร็จ</div>
                <div style={{ fontSize:12, color:'var(--text-2)' }}>
                  นำเข้า <strong style={{ color:'var(--green)' }}>{result.imported.toLocaleString()}</strong> records
                  {result.failed > 0 && <span style={{ color:'var(--amber)' }}> · ข้าม {result.failed} records (error)</span>}
                </div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:6 }}>ไปที่ History หรือ Dashboard เพื่อดูข้อมูลที่นำเข้า</div>
              </div>
            ) : (
              <button
                onClick={startImport}
                disabled={!selected.size}
                style={{
                  width:'100%', padding:'13px', borderRadius:10, fontSize:14, fontWeight:600,
                  cursor: selected.size ? 'pointer' : 'not-allowed',
                  background: selected.size ? 'var(--blue)' : 'var(--bg2)',
                  color: selected.size ? '#0d1117' : 'var(--text-3)',
                  border:'none', transition:'all 0.2s',
                }}
              >
                <i className="ti ti-database-import" style={{ marginRight:8 }} />
                Import {parsed.payloads.filter(p => selected.has(p.compressor_id)).length.toLocaleString()} records เข้าฐานข้อมูล
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
