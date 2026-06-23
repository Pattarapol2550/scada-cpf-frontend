import { ASSET_MAP, SYMBOL_SIZE } from '../../../config/monitor/lineDuckBindings.js'

/**
 * Renders one equipment symbol from public/assets SVG.
 */
export default function SchematicSymbol({
  type,
  x,
  y,
  width,
  height,
  label,
}) {
  const href = ASSET_MAP[type]
  const size = SYMBOL_SIZE[type] ?? { width: 48, height: 48 }
  const w = width ?? size.width
  const h = height ?? size.height

  if (!href) return null

  return (
    <g className="schematic-symbol" data-type={type}>
      <image
        href={href}
        x={x}
        y={y}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMid meet"
      />
      {label && (
        <text
          x={x + w / 2}
          y={y + h + 14}
          textAnchor="middle"
          fill="var(--text-2)"
          fontSize="11"
          fontFamily="Inter, sans-serif"
        >
          {label}
        </text>
      )}
    </g>
  )
}
