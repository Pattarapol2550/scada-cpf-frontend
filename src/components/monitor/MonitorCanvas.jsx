import { VIEWBOX } from '../../config/monitor/schematicTheme.js'
import SymbolsLayer from './layers/SymbolsLayer.jsx'

/**
 * SVG root for synoptic diagram. Layers added in later steps.
 * @param {object} [props]
 * @param {Record<string, unknown>} [props.compressors] — fleet map (Step 7+)
 * @param {string} [props.lineStatus] — fleet rollup (Step 7+)
 */
export default function MonitorCanvas() {
  const { width, height } = VIEWBOX

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ display: 'block', maxHeight: 'calc(100vh - 52px)' }}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Refrigeration system synoptic diagram"
    >
      <defs>
        <pattern
          id="monitor-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="var(--border)"
            strokeWidth="0.5"
            opacity="0.35"
          />
        </pattern>
      </defs>

      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        fill="var(--bg1)"
      />
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        fill="url(#monitor-grid)"
      />
      <rect
        x="8"
        y="8"
        width={width - 16}
        height={height - 16}
        fill="none"
        stroke="var(--border)"
        strokeWidth="1"
        rx="4"
      />

      <SymbolsLayer />
    </svg>
  )
}
