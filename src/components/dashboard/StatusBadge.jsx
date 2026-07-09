const STATUS_MAP = {
  Critical: { bg: 'var(--red-dim)', color: 'var(--red)', dot: 'var(--red)', label: 'Critical' },
  Warning:  { bg: 'var(--amber-dim)', color: 'var(--amber)', dot: 'var(--amber)', label: 'Warning'  },
  Normal:   { bg: 'var(--green-dim)', color: 'var(--green)', dot: 'var(--green)', label: 'Normal'   },
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
