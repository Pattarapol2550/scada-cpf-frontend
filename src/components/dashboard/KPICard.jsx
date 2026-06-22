export default function KPICard({ label, value, unit, accent, warn, sparkline }) {
  return (
    <div style={{
      background: 'var(--bg1)',
      border: '1px solid var(--border)',
      borderTop: `2px solid ${accent}`,
      borderRadius: 12,
      padding: '14px 16px 10px',
      transition: 'background 0.2s',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 6,
      }}>{label}</div>

      <div style={{
        fontSize: 22, fontWeight: 600,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--text-1)', lineHeight: 1.1,
      }}>
        {value ?? '--'}
      </div>

      {unit && (
        <div style={{
          fontSize: 10, color: 'var(--text-2)',
          fontFamily: 'JetBrains Mono, monospace', marginTop: 3,
        }}>{unit}</div>
      )}

      {warn && (
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--red)', marginTop: 4 }}>
          ⚠ {warn}
        </div>
      )}

      {/* Sparkline — mini trend */}
      {sparkline && (
        <div style={{ marginTop: warn ? 4 : 8 }}>
          {sparkline}
        </div>
      )}
    </div>
  )
}