const STATUS_MAP = {
  Critical: { bg: 'rgba(163,45,45,0.12)', color: '#a32d2d', dot: '#a32d2d', label: 'Critical' },
  Warning:  { bg: 'rgba(133,79,11,0.12)', color: '#854f0b', dot: '#854f0b', label: 'Warning'  },
  Normal:   { bg: 'rgba(63,185,80,0.12)', color: '#27500a', dot: '#639922', label: 'Normal'   },
  '--':     { bg: 'var(--bg3)',           color: 'var(--text-3)', dot: 'var(--text-3)', label: 'No data' },
}

export default function StatusBadge({ severity }) {
  const s = STATUS_MAP[severity] ?? STATUS_MAP['--']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 600,
      padding: '2px 7px', borderRadius: 20,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}
