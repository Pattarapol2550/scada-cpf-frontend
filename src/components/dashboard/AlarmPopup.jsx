export default function AlarmPopup({ popup, onClose, onDetail, formatFull }) {
  if (!popup) return null
  const hasCrit = popup.alarms.some(a => a.severity === 'Critical')
  const color   = hasCrit ? 'var(--red)'     : 'var(--amber)'
  const bgColor = hasCrit ? 'var(--red-dim)' : 'var(--amber-dim)'
  const border  = hasCrit ? 'rgba(248,81,73,0.4)' : 'rgba(210,153,34,0.4)'
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 500,
      width: 310, background: 'var(--bg1)',
      border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      animation: 'slideInRight 0.25s ease-out',
    }}>
      <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', background: bgColor,
        borderBottom: `1px solid ${border}`,
      }}>
        <span style={{ fontSize: 14 }}>{hasCrit ? '🔴' : '🟡'}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {hasCrit ? 'Critical Alert' : 'Warning'}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div style={{ padding: '10px 14px 6px' }}>
        {popup.alarms.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{a.title}</span>
          </div>
        ))}
        <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          {formatFull(popup.timestamp)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '8px 14px 12px' }}>
        <button onClick={onDetail} style={{ flex: 1, padding: '7px 0', fontSize: 12, borderRadius: 7, background: color, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          ดูรายละเอียด
        </button>
        <button onClick={onClose} style={{ flex: 1, padding: '7px 0', fontSize: 12, borderRadius: 7, background: 'var(--bg2)', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          ปิด
        </button>
      </div>
    </div>
  )
}
