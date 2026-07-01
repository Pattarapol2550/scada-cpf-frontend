import { useState, useEffect } from 'react'
import { toLocalDT } from '../../utils/format'
import Sidebar from '../layout/Sidebar'

function Clock({ collapsed }) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok', hour12: false,
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  if (collapsed) return null
  return (
    <div style={{
      fontSize: 11, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace',
      padding: '5px 10px', background: 'var(--bg2)', borderRadius: 6,
      textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden',
     
    }}>{time}</div>
  )
}

const SHORTCUTS = [
  { h: 1,  label: '1H'  },
  { h: 4,  label: '4H'  },
  { h: 8,  label: '8H'  },
  { h: 24, label: '24H' },
]

export default function FilterBar({ start, setStart, end, setEnd, onSearch }) {
  const [activeShortcut, setActiveShortcut] = useState(null)

  const setRangeH = (hours) => {
    const now = new Date(), past = new Date(now - hours * 3600000)
    const s = toLocalDT(past), e = toLocalDT(now)
    setStart(s); setEnd(e); setActiveShortcut(hours); onSearch(s, e)
  }

  const handleReset = () => {
    const now = new Date(), past = new Date(now - 2 * 3600 * 1000)
    const s = toLocalDT(past), e = toLocalDT(now)
    setStart(s); setEnd(e); setActiveShortcut(null); onSearch(s, e)
  }

  const diffH = start && end ? (new Date(end) - new Date(start)) / 3600000 : 0

  return (
    <div style={{
      background: 'var(--bg1)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 16px',
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
    }}>
      {[['เริ่ม', start, setStart], ['สิ้นสุด', end, setEnd]].map(([label, val, set]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</span>
          <input type="datetime-local" value={val} onChange={e => set(e.target.value)}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', padding: '6px 10px', fontSize: 12, outline: 'none' }} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 4 }}>
        {SHORTCUTS.map(({ h, label }) => (
          <button key={h} onClick={() => setRangeH(h)} style={{
            padding: '6px 10px', fontSize: 11, fontWeight: 500, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
            background: activeShortcut === h ? 'var(--blue-dim)' : 'var(--bg2)',
            border: `1px solid ${activeShortcut === h ? 'var(--blue)' : 'var(--border)'}`,
            color: activeShortcut === h ? 'var(--blue)' : 'var(--text-2)',
          }}>{label}</button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock />
        <button className="btn-ghost" onClick={handleReset}>Reset</button>
        <button className="btn-primary" onClick={() => onSearch(start, end)}>🔍 Search</button>
      </div>
      {diffH > 24 && (
        <div style={{ width: '100%', fontSize: 10, color: 'var(--amber)', background: 'var(--amber-dim)', border: '1px solid rgba(210,153,34,0.25)', borderRadius: 6, padding: '4px 10px' }}>
          ⚠ ช่วงที่เลือกยาวกว่า 24 ชม. จะแสดงผลแค่ 720 records ล่าสุด
        </div>
      )}
    </div>
  )
}
