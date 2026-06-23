export default function Sparkline({ data, color }) {
  const pts = (data || []).filter(v => v !== null)
  if (pts.length < 2) return null
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min || 1
  const W = 100, H = 24, pad = 2
  const x = (i) => pad + (i / (data.length - 1)) * (W - pad * 2)
  const y = (v)  => pad + (1 - (v - min) / range) * (H - pad * 2)
  const allPts = data.map((v, i) => v !== null ? `${x(i)},${y(v)}` : null).filter(Boolean)
  const last   = data.reduce((acc, v, i) => v !== null ? { v, i } : acc, null)
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ display: 'block', marginTop: 6 }}>
      <polyline points={allPts.join(' ')} fill="none"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {last && <circle cx={x(last.i)} cy={y(last.v)} r="2.5" fill={color} />}
    </svg>
  )
}
