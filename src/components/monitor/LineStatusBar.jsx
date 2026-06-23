import { LINE_STATUS_LABELS } from '../../config/monitor/schematicTheme.js'
import { STATUS } from '../../utils/monitor/compressorStatus.js'

/**
 * Fleet-level status strip (no title / logo).
 */
export default function LineStatusBar({ lineStatus = STATUS.LOADING }) {
  const info = LINE_STATUS_LABELS[lineStatus] ?? LINE_STATUS_LABELS[STATUS.LOADING]
  const isOk = lineStatus === STATUS.NORMAL || lineStatus === STATUS.STOPPED

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
      padding: '8px 14px',
      background: 'var(--bg1)',
      border: `1px solid ${isOk ? 'var(--border)' : lineStatus === STATUS.CRITICAL ? 'rgba(248,81,73,0.35)' : 'rgba(210,153,34,0.35)'}`,
      borderRadius: 10,
    }}>
      <span style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: info.color,
        flexShrink: 0,
        boxShadow: isOk ? '0 0 0 3px rgba(63,185,80,0.2)' : undefined,
      }} />
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: info.color,
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        {info.label}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
        Fleet status
      </span>
    </div>
  )
}
