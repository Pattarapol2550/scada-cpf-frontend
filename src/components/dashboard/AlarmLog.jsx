function formatThaiTime(str) {
  if (!str) return '--'
  return new Date(str).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', hour12: false,
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function AlarmCard({ alarm, timestamp }) {
  const isCrit = alarm.severity === 'Critical'
  return (
    <div style={{
      borderRadius: 8, padding: '10px 12px',
      borderLeft: `3px solid ${isCrit ? 'var(--red)' : 'var(--amber)'}`,
      background: isCrit ? 'var(--red-dim)' : 'var(--amber-dim)',
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: isCrit ? 'var(--red)' : 'var(--amber)',
        }}>
          {isCrit ? '🔴' : '🟡'} {alarm.title}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>
          {formatThaiTime(timestamp)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>
        {alarm.message}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>Possible causes</div>
        <ul style={{ paddingLeft: 14, margin: 0 }}>
          {alarm.possible_causes?.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
        <div style={{ fontWeight: 600, margin: '4px 0 2px' }}>Recommendation</div>
        <ul style={{ paddingLeft: 14, margin: 0 }}>
          {alarm.recommendation?.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </div>
  )
}

export default function AlarmLog({ records, singleRecord = false }) {
  const MAX = singleRecord ? Infinity : 60
  const alarmItems = []
  let count = 0

  records?.forEach(rec => {
    ;(rec.diagnosis?.alarms || []).forEach(al => {
      if (count++ < MAX) alarmItems.push({ alarm: al, timestamp: rec.timestamp })
    })
  })

  if (!alarmItems.length) {
    return (
      <div style={{
        padding: 12, borderRadius: 8,
        background: 'var(--green-dim)',
        border: '1px solid rgba(63,185,80,0.2)',
        fontSize: 12, fontWeight: 600, color: 'var(--green)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        ✅ ไม่พบ Alarm ในช่วงเวลานี้
      </div>
    )
  }

  return (
    <div style={{ maxHeight: 340, overflowY: 'auto' }}>
      {alarmItems.map((item, i) => (
        <AlarmCard key={i} alarm={item.alarm} timestamp={item.timestamp} />
      ))}
    </div>
  )
}
