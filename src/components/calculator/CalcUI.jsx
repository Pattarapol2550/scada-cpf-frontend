import { useState } from 'react'

// ─── Layout grids ─────────────────────────────────────────────────────────────
export const g2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }
export const g3  = { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }
export const g3p = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }
export const g4  = { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:12 }

// ─── Structural ───────────────────────────────────────────────────────────────
export function Panel({ children }) {
  return (
    <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
      {children}
    </div>
  )
}

export function PanelHead({ num, label, color = 'var(--blue)' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)' }}>
      <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, fontWeight:700, background:color, color:'#fff', width:20, height:20, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{num}</span>
      <span style={{ fontSize:13, fontWeight:500 }}>{label}</span>
    </div>
  )
}

export function Row2({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>{children}</div>
}

// ─── Form ─────────────────────────────────────────────────────────────────────
export function Field({ label, unit, value, onChange, placeholder, optional, assumeText }) {
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

export function CalcBtn({ color, onClick, loading, children }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ width:'100%', padding:13, border:'none', borderRadius:8, fontFamily:'JetBrains Mono, monospace', fontSize:14, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', margin:'4px 0 16px', background:color, color:'#fff', opacity: loading ? .6 : 1 }}>
      {loading ? '⏳ กำลังคำนวณ…' : children}
    </button>
  )
}

// ─── Display ──────────────────────────────────────────────────────────────────
export function Notice({ children, color = 'var(--blue)' }) {
  return (
    <div style={{ borderRadius:6, padding:'7px 12px', marginBottom:11, fontFamily:'JetBrains Mono, monospace', fontSize:11, color, lineHeight:1.6, background:`${color}18`, border:`1px solid ${color}44` }}>
      {children}
    </div>
  )
}

export function RCard({ label, value, unit, sub, color = 'var(--blue)' }) {
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

export function Badge({ mode, text }) {
  const ok = mode === 'measured'
  return (
    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, padding:'3px 9px', borderRadius:10, border:'1px solid', background: ok ? 'var(--green-dim)' : 'rgba(139,148,158,0.1)', color: ok ? 'var(--green)' : 'var(--text-3)', borderColor: ok ? 'rgba(63,185,80,.25)' : 'rgba(139,148,158,.25)' }}>
      {text}
    </span>
  )
}

export function WarnBox({ level, msg }) {
  const d = level === 'danger'
  return (
    <div style={{ borderRadius:7, padding:'9px 13px', marginBottom:8, fontFamily:'JetBrains Mono, monospace', fontSize:12, border:'1px solid', background: d ? 'var(--red-dim)' : 'var(--amber-dim)', borderColor: d ? 'rgba(248,81,73,.25)' : 'rgba(210,153,34,.25)', color: d ? 'var(--red)' : 'var(--amber)' }}>
      ⚠ {msg}
    </div>
  )
}

export function ErrBox({ msg }) {
  if (!msg) return null
  return (
    <div style={{ background:'var(--red-dim)', border:'1px solid rgba(248,81,73,.3)', borderRadius:8, padding:'10px 14px', marginBottom:12, color:'var(--red)', fontFamily:'JetBrains Mono, monospace', fontSize:12 }}>
      ⚠ {msg}
    </div>
  )
}

export function DetailTable({ sections }) {
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
