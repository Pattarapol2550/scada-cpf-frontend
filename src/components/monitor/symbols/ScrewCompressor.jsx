import { SYMBOL_SIZE } from '../../../config/monitor/lineDuckBindings.js'
import { getSymbolVisual } from '../../../config/monitor/schematicTheme.js'
import { STATUS } from '../../../utils/monitor/compressorStatus.js'
import SchematicSymbol from './SchematicSymbol.jsx'

function dashArray(style) {
  if (style === 'dashed') return '6 4'
  if (style === 'dotted') return '2 3'
  return undefined
}

/**
 * Screw compressor with alarm-driven border and optional S/W overlay.
 */
export default function ScrewCompressor({ node, comp }) {
  const size = SYMBOL_SIZE.ScrewCompressor
  const w = node.width ?? size.width
  const h = node.height ?? size.height
  const { x, y, label } = node

  const status = comp?.status ?? STATUS.LOADING
  const mode = comp?.mode ?? 'AUTO'
  const visual = getSymbolVisual(status)
  const pad = 4

  const isSW = mode === 'SW'

  return (
    <g
      className={`screw-compressor${visual.pulse ? ' monitor-critical-pulse' : ''}`}
      data-status={status}
      data-node-id={node.id}
    >
      {/* Health status border */}
      {visual.borderWidth > 0 && (
        <rect
          x={x - pad}
          y={y - pad}
          width={w + pad * 2}
          height={h + pad * 2}
          fill="none"
          stroke={visual.borderColor}
          strokeWidth={visual.borderWidth}
          strokeDasharray={dashArray(visual.borderStyle)}
          rx="4"
        />
      )}

      {/* Manual S/W overlay (independent of alarm color) */}
      {isSW && (
        <rect
          x={x - pad - 2}
          y={y - pad - 2}
          width={w + (pad + 2) * 2}
          height={h + (pad + 2) * 2}
          fill="none"
          stroke="var(--green)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
          rx="5"
        />
      )}

      <g opacity={visual.opacity}>
        <SchematicSymbol
          type="ScrewCompressor"
          x={x}
          y={y}
          width={w}
          height={h}
          label={label}
        />
      </g>

      {isSW && (
        <text
          x={x + w + 6}
          y={y + 12}
          fill="var(--red)"
          fontSize="10"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          S/W
        </text>
      )}

      {visual.badge && (
        <g>
          <rect
            x={x + w - 28}
            y={y - 2}
            width={30}
            height={14}
            rx="3"
            fill={visual.borderColor}
            opacity="0.95"
          />
          <text
            x={x + w - 13}
            y={y + 9}
            textAnchor="middle"
            fill="#fff"
            fontSize="8"
            fontWeight="700"
            fontFamily="JetBrains Mono, monospace"
          >
            {visual.badge}
          </text>
        </g>
      )}
    </g>
  )
}
