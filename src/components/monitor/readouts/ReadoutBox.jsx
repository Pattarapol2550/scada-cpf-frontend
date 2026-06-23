/**
 * Base value box for synoptic readouts (SVG).
 */
export default function ReadoutBox({
  x,
  y,
  value,
  unit,
  width = 76,
  height = 26,
  bg = 'var(--bg2)',
  border = 'var(--border)',
  textColor = 'var(--text-1)',
}) {
  const display = value == null || value === '' ? '--' : value
  const label = unit ? `${display} ${unit}` : String(display)

  return (
    <g className="readout-box">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="4"
        fill={bg}
        stroke={border}
        strokeWidth="1"
      />
      <text
        x={x + width / 2}
        y={y + height / 2 + 4}
        textAnchor="middle"
        fill={textColor}
        fontSize="11"
        fontWeight="600"
        fontFamily="JetBrains Mono, monospace"
      >
        {label}
      </text>
    </g>
  )
}
